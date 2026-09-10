import type { Purchase, PurchaseStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment";
import { finalizePurchase } from "./finalize-purchase";

/**
 * Opportunistic self-heal — Layer B of docs/PAYMENT-SELF-HEALING.md.
 *
 * Whenever a user or admin loads a page that shows a purchase, we re-ask the
 * payment provider for its real status and finalize if it moved. This turns
 * "Cashfree says paid, site says pending/failed" into a self-correcting
 * condition: the person who notices the problem is the one whose page load
 * fixes it.
 *
 * These functions are safe to await in a Server Component render / request
 * path: they never throw, provider calls are rate-limited per purchase, and
 * finalizePurchase is idempotent.
 */

/** Min gap between provider polls for the same purchase (Cashfree guidance: 3-5s). */
const MIN_POLL_INTERVAL_MS = 3000;
/** FAILED/CANCELLED older than this are considered settled and left alone. */
const HEAL_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
/** Cap provider calls per invocation so a page load never stalls on a long list. */
const MAX_CALLS_PER_INVOCATION = 3;

// Process-local throttle. Fine to reset on redeploy — it's a rate limit, not a lock.
const lastPolledAt = new Map<string, number>();

function throttled(purchaseId: string): boolean {
  const now = Date.now();
  const last = lastPolledAt.get(purchaseId) ?? 0;
  if (now - last < MIN_POLL_INTERVAL_MS) return true;
  lastPolledAt.set(purchaseId, now);
  return false;
}

/** A purchase worth re-checking against the provider. */
function isHealable(p: Pick<Purchase, "status" | "heldForReview" | "paymentProvider" | "createdAt">): boolean {
  if (p.heldForReview) return false; // an admin must resolve these
  if (p.paymentProvider === "free") return false; // never went to a gateway
  if (p.status === "PENDING") return true;
  if (p.status === "FAILED" || p.status === "CANCELLED") {
    return p.createdAt.getTime() > Date.now() - HEAL_WINDOW_MS;
  }
  return false; // SUCCESS / EXPIRED / REFUNDED are terminal
}

async function pollAndFinalize(providerOrderId: string): Promise<void> {
  const provider = getPaymentProvider();
  const result = await provider.getOrderStatus(providerOrderId);
  if (result.status !== "PENDING") {
    await finalizePurchase(result);
  }
}

/**
 * Re-check one purchase. Returns its (possibly updated) status, or null if the
 * purchase doesn't exist or something failed.
 */
export async function healPurchase(purchaseId: string): Promise<PurchaseStatus | null> {
  try {
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) return null;
    if (isHealable(purchase) && !throttled(purchase.id)) {
      await pollAndFinalize(purchase.providerOrderId);
      const updated = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        select: { status: true },
      });
      return updated?.status ?? purchase.status;
    }
    return purchase.status;
  } catch (err) {
    console.error(`healPurchase(${purchaseId}) failed`, err);
    return null;
  }
}

function healableWhere() {
  return {
    heldForReview: false,
    paymentProvider: { not: "free" },
    OR: [
      { status: "PENDING" as const },
      {
        status: { in: ["FAILED", "CANCELLED"] as PurchaseStatus[] },
        createdAt: { gt: new Date(Date.now() - HEAL_WINDOW_MS) },
      },
    ],
  };
}

async function healMany(purchases: Pick<Purchase, "id" | "providerOrderId">[]): Promise<void> {
  let calls = 0;
  for (const purchase of purchases) {
    if (calls >= MAX_CALLS_PER_INVOCATION) break;
    if (throttled(purchase.id)) continue;
    calls += 1;
    try {
      await pollAndFinalize(purchase.providerOrderId);
    } catch (err) {
      console.error(`healMany: ${purchase.id} failed`, err);
    }
  }
}

/**
 * Re-check every non-settled purchase of one user (recent window), bounded by
 * MAX_CALLS_PER_INVOCATION so "My Purchases" stays fast. Anything not reached
 * this time is picked up by the next page load or the in-process sweep.
 */
export async function healUserPurchases(userId: string): Promise<void> {
  try {
    const candidates = await prisma.purchase.findMany({
      where: { userId, ...healableWhere() },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, providerOrderId: true },
    });
    await healMany(candidates);
  } catch (err) {
    console.error(`healUserPurchases(${userId}) failed`, err);
  }
}

/**
 * Heal the non-settled purchases among a given set of ids (e.g. the rows an
 * admin is currently looking at). Same per-purchase throttle and per-call cap.
 */
export async function healPurchaseIds(purchaseIds: string[]): Promise<void> {
  if (purchaseIds.length === 0) return;
  try {
    const candidates = await prisma.purchase.findMany({
      where: { id: { in: purchaseIds }, ...healableWhere() },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, providerOrderId: true },
    });
    await healMany(candidates);
  } catch (err) {
    console.error("healPurchaseIds failed", err);
  }
}
