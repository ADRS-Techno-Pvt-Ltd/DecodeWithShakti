import { Prisma } from "@/generated/prisma/client";
import type { Purchase, Order } from "@/generated/prisma/client";
import { finalizeOrder } from "@/lib/payment/finalize-order";
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
const RECHECK_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // FAILED/CANCELLED older than this are left alone
const PENDING_GRACE_MS = 5 * 60 * 1000; // don't poll checkouts the customer is likely still completing
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

/** Multi-item cart Order counterpart of reconcileOne — polls the provider order and applies the result. */
async function reconcileOneOrder(
  order: Order,
  provider: PaymentProvider,
  summary: ReconcileSummary,
  opts: { forceExpireOnPending: boolean },
) {
  summary.scanned += 1;
  try {
    const result = await provider.getOrderStatus(order.providerOrderId);

    await prisma.paymentEvent.create({
      data: {
        provider: provider.name,
        eventId: `poll:order:${order.id}:${crypto.randomUUID()}`,
        eventType: "RECONCILE_POLL",
        providerOrderId: order.providerOrderId,
        signatureValid: true,
        rawPayload: (result.rawPayload as object | undefined) ?? { status: result.status },
      },
    });

    if (result.status === "PENDING") {
      if (opts.forceExpireOnPending) {
        const count = await prisma.$transaction(async (tx) => {
          const { count } = await tx.order.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: { status: "EXPIRED" },
          });
          if (count > 0) {
            await tx.purchase.updateMany({
              where: { orderId: order.id, status: "PENDING" },
              data: { status: "EXPIRED" },
            });
          }
          return count;
        });
        if (count > 0) summary.resolved.EXPIRED += 1;
      }
    } else {
      const outcome = await finalizeOrder(result);
      if (outcome.applied && result.status in summary.resolved) {
        summary.resolved[result.status as keyof typeof summary.resolved] += 1;
      }
    }
  } catch (err) {
    summary.errors += 1;
    const attempts = order.reconcileAttempts + 1;
    await prisma.order
      .update({
        where: { id: order.id },
        data:
          attempts >= MAX_RECONCILE_ATTEMPTS
            ? { reconcileAttempts: attempts, heldForReview: true, failureCode: "reconcile_exhausted" }
            : { reconcileAttempts: attempts },
      })
      .catch(() => {});
    if (attempts >= MAX_RECONCILE_ATTEMPTS) summary.held += 1;
    console.error(`reconcile: order ${order.id} failed`, err);
  }
}

/** Sweep PENDING orders (and recently FAILED/CANCELLED ones that may have been retried successfully). */
async function reconcileOrders(provider: PaymentProvider, summary: ReconcileSummary) {
  const now = new Date();
  const base = {
    paymentProvider: provider.name,
    heldForReview: false,
    reconcileAttempts: { lt: MAX_RECONCILE_ATTEMPTS },
  };

  const pending = await prisma.order.findMany({
    where: { ...base, status: "PENDING", createdAt: { lt: new Date(Date.now() - PENDING_GRACE_MS) } },
    take: BATCH_LIMIT,
    orderBy: { createdAt: "asc" },
  });
  for (const order of pending) {
    await reconcileOneOrder(order, provider, summary, {
      forceExpireOnPending: order.expiresAt != null && order.expiresAt < now,
    });
    await sleep(POLL_DELAY_MS);
  }

  const failed = await prisma.order.findMany({
    where: {
      ...base,
      status: { in: ["FAILED", "CANCELLED"] },
      createdAt: { gt: new Date(Date.now() - RECHECK_WINDOW_MS) },
    },
    take: BATCH_LIMIT,
    orderBy: { createdAt: "desc" },
  });
  for (const order of failed) {
    await reconcileOneOrder(order, provider, summary, { forceExpireOnPending: false });
    await sleep(POLL_DELAY_MS);
  }
}

/**
 * Re-check exactly one purchase (the admin "Re-check payment" action). Returns
 * null when the purchase id doesn't exist.
 */
export async function reconcileSinglePurchase(purchaseId: string): Promise<ReconcileSummary | null> {
  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return null;

  const summary = emptySummary();

  // Multi-item cart purchases don't have their own Cashfree order — their
  // providerOrderId is a synthetic `${order.id}:${bank.id}` key, not a real
  // order id. Re-checking those belongs to the parent Order (Order-level
  // reconciliation is not implemented yet), so skip rather than 400 Cashfree.
  if (purchase.orderId != null) return summary;

  if (purchase.status === "PENDING" || purchase.status === "FAILED" || purchase.status === "CANCELLED") {
    // This is a single, explicit, admin-targeted action on one known purchase —
    // unlike the bulk sweep (which stays scoped to the currently active
    // provider to avoid hammering a deactivated gateway across many rows),
    // it's safe and correct to poll using the SPECIFIC provider that created
    // this purchase (e.g. re-checking an old Cashfree purchase after
    // PAYMENT_PROVIDER has since switched to razorpay) — as long as that
    // provider's env vars are still configured. If they're not, this throws
    // and the admin sees a clear error instead of a silent no-op.
    const provider = getPaymentProvider(purchase.paymentProvider);
    const forceExpireOnPending =
      purchase.status === "PENDING" && purchase.expiresAt != null && purchase.expiresAt < new Date();
    // A failed/dropped attempt is not terminal on a Cashfree/Razorpay order —
    // a later attempt on the same order may have succeeded. finalizePurchase
    // promotes the row only if the provider now reports SUCCESS.
    await reconcileOne(purchase, provider, summary, { forceExpireOnPending });
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
      // Only purchases created under the currently active provider — a
      // purchase created while a different PAYMENT_PROVIDER was active has a
      // providerOrderId that provider.getOrderStatus() can't resolve (wrong
      // gateway entirely), which would just error every sweep until
      // reconcileAttempts exhausts and wrongly holds it for review.
      paymentProvider: provider.name,
      heldForReview: false,
      // Multi-item cart purchases don't have their own Cashfree order — their
      // providerOrderId is a synthetic `${order.id}:${bank.id}` key. The
      // parent Order is reconciled separately (finalize-order.ts / webhook).
      orderId: null,
      // Poll every PENDING row older than a grace period, not just expired ones:
      // a customer may have paid while our webhook was missed. Only rows past
      // expiresAt are force-expired when the provider still reports no payment.
      createdAt: { lt: new Date(Date.now() - PENDING_GRACE_MS) },
      reconcileAttempts: { lt: MAX_RECONCILE_ATTEMPTS },
    },
    take: BATCH_LIMIT,
    orderBy: { createdAt: "asc" },
  });
  const now = new Date();
  for (const purchase of stalePending) {
    await reconcileOne(purchase, provider, summary, {
      forceExpireOnPending: purchase.expiresAt != null && purchase.expiresAt < now,
    });
    await sleep(POLL_DELAY_MS);
  }

  await reconcileOrders(provider, summary);

  // Recently FAILED / CANCELLED orders can still flip to PAID if the customer
  // retried a later attempt on the same Cashfree order.
  const recentlyFailed = await prisma.purchase.findMany({
    where: {
      status: { in: ["FAILED", "CANCELLED"] },
      paymentProvider: provider.name,
      heldForReview: false,
      orderId: null,
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
