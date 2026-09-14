import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin, toErrorResponse } from "@/lib/auth-guards";
import { runReconcileSweep, reconcileSinglePurchase } from "@/lib/payment/reconcile-core";

function cronSecretMatches(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Sweeps stuck orders and repairs SUCCESS purchases missing an invoice.
 * Authorized by either a shared cron secret (optional VPS crontab) or an admin
 * session (the dashboard's "Reconcile pending" button, and the per-row
 * "Re-check payment" action via an optional `{ purchaseId }` body).
 *
 * The same sweep also runs on an in-process timer with no external caller — see
 * src/instrumentation.ts and docs/PAYMENT-SELF-HEALING.md.
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

  try {
    if (purchaseId) {
      const summary = await reconcileSinglePurchase(purchaseId);
      if (!summary) {
        return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
      }
      return NextResponse.json(summary);
    }

    // Manual trigger — always run, don't take the timer's cross-instance lock.
    const summary = await runReconcileSweep({
      source: usingCronSecret ? "cron" : "admin-button",
      lock: false,
    });
    return NextResponse.json(summary);
  } catch (err) {
    return toErrorResponse(err);
  }
}
