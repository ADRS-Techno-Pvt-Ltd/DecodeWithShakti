import { Prisma } from "@/generated/prisma/client";
import type { Purchase } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment";
import { finalizePurchase, ensureInvoice } from "@/lib/payment/finalize-purchase";
import type { PaymentProvider } from "@/lib/payment/provider";

/**
 * The reconcile sweep, extracted from the HTTP route so it has three callers:
 * the admin "Reconcile pending" button (route.ts), the per-row "Re-check
 * payment" action (route.ts), and the in-process self-heal timer
 * (src/instrumentation.ts). See docs/PAYMENT-SELF-HEALING.md § 2.3.
 */

export const MAX_RECONCILE_ATTEMPTS = 10;
const BATCH_LIMIT = 50;
const POLL_DELAY_MS = 250; // stay well under Cashfree's per-minute rate limits across a batch
const RECHECK_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // FAILED/CANCELLED older than this are left alone
const SWEEP_LOCK_BUCKET_MS = 2 * 60 * 1000; // one sweep per this window across all instances

export type ReconcileSummary = {
  scanned: number;
  resolved: { SUCCESS: number; FAILED: number; CANCELLED: number; EXPIRED: number };
  invoicesRepaired: number;
  held: number;
  errors: number;
  /** true when a run was skipped because another instance holds the lock for this window */
  skipped?: boolean;
};

export function emptySummary(): ReconcileSummary {
  return {
    scanned: 0,
    resolved: { SUCCESS: 0, FAILED: 0, CANCELLED: 0, EXPIRED: 0 },
    invoicesRepaired: 0,
    held: 0,
    errors: 0,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polls one purchase and applies the result. Shared by the batch sweep and the single-order re-check. */
async function reconcileOne(
  purchase: Purchase,
  provider: PaymentProvider,
  summary: ReconcileSummary,
  opts: { forceExpireOnPending: boolean },
) {
  summary.scanned += 1;
  try {
    const result = await provider.getOrderStatus(purchase.providerOrderId);

    await prisma.paymentEvent.create({
      data: {
        provider: provider.name,
        eventId: `poll:${purchase.id}:${crypto.randomUUID()}`,
        eventType: "RECONCILE_POLL",
        purchaseId: purchase.id,
        providerOrderId: purchase.providerOrderId,
        signatureValid: true,
        rawPayload: (result.rawPayload as object | undefined) ?? { status: result.status },
      },
    });

    if (result.status === "PENDING") {
      if (opts.forceExpireOnPending) {
        // Cashfree confirmed there's still no terminal payment attempt, and our
        // own expiry window has already closed — this order is done, not "still
        // trying". No need to keep retrying it.
        const { count } = await prisma.purchase.updateMany({
          where: { id: purchase.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
        if (count > 0) summary.resolved.EXPIRED += 1;
      }
      // else: not yet expired — genuinely still pending, nothing to do.
    } else {
      const outcome = await finalizePurchase(result);
      if (outcome.applied && result.status in summary.resolved) {
        summary.resolved[result.status as keyof typeof summary.resolved] += 1;
      }
    }
  } catch (err) {
    // The poll itself failed (network/API error, not a resolved status) —
    // retry on the next sweep, up to a budget, then surface for a human.
    summary.errors += 1;
    const attempts = purchase.reconcileAttempts + 1;
    await prisma.purchase
      .update({
        where: { id: purchase.id },
        data:
          attempts >= MAX_RECONCILE_ATTEMPTS
            ? { reconcileAttempts: attempts, heldForReview: true, failureCode: "reconcile_exhausted" }
            : { reconcileAttempts: attempts },
      })
      .catch(() => {});
    if (attempts >= MAX_RECONCILE_ATTEMPTS) summary.held += 1;
    console.error(`reconcile: purchase ${purchase.id} failed`, err);
  }
}

/**
 * Re-check exactly one purchase (the admin "Re-check payment" action). Returns
 * null when the purchase id doesn't exist.
 */
export async function reconcileSinglePurchase(purchaseId: string): Promise<ReconcileSummary | null> {
  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return null;

  const provider = getPaymentProvider();
  const summary = emptySummary();

  if (purchase.status === "PENDING") {
    const pastExpiry = purchase.expiresAt != null && purchase.expiresAt < new Date();
    await reconcileOne(purchase, provider, summary, { forceExpireOnPending: pastExpiry });
  } else if (purchase.status === "FAILED" || purchase.status === "CANCELLED") {
    // A failed/dropped attempt is not terminal on a Cashfree order — a later
    // attempt on the same order may have succeeded. finalizePurchase promotes
    // the row only if the provider now reports SUCCESS.
    await reconcileOne(purchase, provider, summary, { forceExpireOnPending: false });
  } else if (purchase.status === "SUCCESS") {
    await ensureInvoice(purchase.id).then(() => {
      summary.invoicesRepaired += 1;
    });
  }
  return summary;
}

/**
 * Cross-instance lock: only one caller per ~2-minute window does a full sweep.
 * Reuses PaymentEvent's @@unique([provider, eventId]) — no schema migration.
 * Returns false when someone else already holds this window's slot.
 */
async function acquireSweepLock(source: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / SWEEP_LOCK_BUCKET_MS);
  try {
    await prisma.paymentEvent.create({
      data: {
        provider: "system",
        eventId: `sweep-lock:${bucket}`,
        eventType: "RECONCILE_SWEEP_LOCK",
        signatureValid: true,
        rawPayload: { source, bucket },
        processedAt: new Date(),
      },
    });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}

/**
 * Full sweep: stuck PENDING orders → resolved/expired; recent FAILED/CANCELLED
 * that Cashfree now reports paid → SUCCESS; SUCCESS purchases missing an
 * invoice → repaired.
 *
 * `lock: true` (used by the timer) makes concurrent instances coordinate via
 * acquireSweepLock. The admin button passes `lock: false` — a manual click
 * should always run.
 */
export async function runReconcileSweep(
  opts: { source: string; lock?: boolean } = { source: "manual" },
): Promise<ReconcileSummary> {
  const summary = emptySummary();

  if (opts.lock && !(await acquireSweepLock(opts.source))) {
    summary.skipped = true;
    return summary;
  }

  const provider = getPaymentProvider();

  const stalePending = await prisma.purchase.findMany({
    where: {
      status: "PENDING",
      heldForReview: false,
      expiresAt: { not: null, lt: new Date() },
      reconcileAttempts: { lt: MAX_RECONCILE_ATTEMPTS },
    },
    take: BATCH_LIMIT,
    orderBy: { expiresAt: "asc" },
  });
  for (const purchase of stalePending) {
    await reconcileOne(purchase, provider, summary, { forceExpireOnPending: true });
    await sleep(POLL_DELAY_MS);
  }

  // Recently FAILED / CANCELLED orders can still flip to PAID if the customer
  // retried a later attempt on the same Cashfree order.
  const recentlyFailed = await prisma.purchase.findMany({
    where: {
      status: { in: ["FAILED", "CANCELLED"] },
      paymentProvider: provider.name,
      heldForReview: false,
      reconcileAttempts: { lt: MAX_RECONCILE_ATTEMPTS },
      createdAt: { gt: new Date(Date.now() - RECHECK_WINDOW_MS) },
    },
    take: BATCH_LIMIT,
    orderBy: { createdAt: "desc" },
  });
  for (const purchase of recentlyFailed) {
    await reconcileOne(purchase, provider, summary, { forceExpireOnPending: false });
    await sleep(POLL_DELAY_MS);
  }

  const missingInvoices = await prisma.purchase.findMany({
    where: { status: "SUCCESS", invoice: null },
    take: BATCH_LIMIT,
  });
  for (const purchase of missingInvoices) {
    try {
      await ensureInvoice(purchase.id);
      summary.invoicesRepaired += 1;
    } catch (err) {
      summary.errors += 1;
      console.error(`reconcile: invoice repair for ${purchase.id} failed`, err);
    }
  }

  return summary;
}
