import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { getPaymentProvider } from "@/lib/payment";
import { finalizePurchase, ensureInvoice } from "@/lib/payment/finalize-purchase";
import type { PaymentProvider } from "@/lib/payment/provider";
import type { Purchase } from "@/generated/prisma/client";

const BATCH_LIMIT = 50;
const MAX_RECONCILE_ATTEMPTS = 10;
const POLL_DELAY_MS = 250; // stay well under Cashfree's per-minute rate limits across a batch

type Summary = {
  scanned: number;
  resolved: { SUCCESS: number; FAILED: number; CANCELLED: number; EXPIRED: number };
  invoicesRepaired: number;
  held: number;
  errors: number;
};

function emptySummary(): Summary {
  return { scanned: 0, resolved: { SUCCESS: 0, FAILED: 0, CANCELLED: 0, EXPIRED: 0 }, invoicesRepaired: 0, held: 0, errors: 0 };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cronSecretMatches(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Polls one PENDING purchase and applies the result. Shared by the batch sweep and a single-order admin re-check. */
async function reconcileOne(purchase: Purchase, provider: PaymentProvider, summary: Summary, opts: { forceExpireOnPending: boolean }) {
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
        // Cashfree successfully confirmed there's still no terminal payment
        // attempt, and our own expiry window has already closed — this order
        // is done, not "still trying". No need to keep retrying it.
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
 * Sweeps stuck PENDING orders and repairs SUCCESS purchases missing an
 * invoice. Authorized by either a shared cron secret (VPS crontab) or an
 * admin session (the dashboard's "Reconcile pending" button, and the per-row
 * "Re-check payment" action via an optional `{ purchaseId }` body). See
 * docs/CASHFREE-PLAN.md § 5 and § 1 ("stuck, precisely defined").
 */
export async function POST(request: Request) {
  const usingCronSecret = cronSecretMatches(request);
  if (!usingCronSecret) {
    try {
      await requireAdmin();
    } catch (err) {
      return toErrorResponse(err);
    }
  }

  const body = await request.json().catch(() => ({}));
  const purchaseId = typeof body?.purchaseId === "string" ? body.purchaseId : null;
  const provider = getPaymentProvider();
  const summary = emptySummary();

  if (purchaseId) {
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
    }
    if (purchase.status === "PENDING") {
      const pastExpiry = purchase.expiresAt != null && purchase.expiresAt < new Date();
      await reconcileOne(purchase, provider, summary, { forceExpireOnPending: pastExpiry });
    } else if (purchase.status === "SUCCESS") {
      await ensureInvoice(purchase.id).then(() => summary.invoicesRepaired++);
    }
    return NextResponse.json(summary);
  }

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

  return NextResponse.json(summary);
}
