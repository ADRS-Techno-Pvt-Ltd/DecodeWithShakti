# Payment Self-Healing — No External Cron

Follow-up hardening to `docs/CASHFREE-PLAN.md`. Goal: a purchase that Cashfree
considers settled can **never** stay stuck in a wrong local status, and the
recovery needs **no Render Cron service and no GitHub Action** — everything runs
inside the existing Next.js app on Render.

## 1. Why this is needed

`docs/CASHFREE-PLAN.md` built the right state machine but left two gaps that bit
us in production (2026-09-10):

1. **`FAILED` / `CANCELLED` were treated as terminal.** Cashfree lets a customer
   make several payment attempts against **one** order. Attempt 1 fails →
   `PAYMENT_FAILED_WEBHOOK` moves the row to `FAILED`. Attempt 2 succeeds →
   `PAYMENT_SUCCESS_WEBHOOK` arrives, but `finalizePurchase` only promoted rows
   still `PENDING`, so the success was silently dropped. Real case: order
   `90f9e7ad-f075-4392-86bc-dd38b14d3d84` (₹125) — `order_status=PAID` at
   Cashfree, `FAILED` on our side, no invoice, no access.
   *(Fixed in the "Part A" code change — see § 2.1.)*

2. **Nothing runs the reconcile sweep on a schedule.** The repo has
   `POST /api/v1/payment/reconcile` and the admin "Reconcile pending" button,
   but no automated caller. A lost webhook is only healed if an admin clicks the
   button or the buyer happens to sit on the return page long enough.

**Source-of-truth principle (make explicit):** the authority on whether money
moved is Cashfree's **Order Status API** (`GET /pg/orders/{id}` +
`/pg/orders/{id}/payments`), *not* the webhook payload. Webhooks are lossy,
can arrive out of order, and can be replayed — they are a *"something changed,
go look"* trigger. Every finalize decision must be backed by an API read.

## 2. The design — three layers, defence in depth

| Layer | Runs when | Covers | Infra |
|---|---|---|---|
| **A. FAILED/CANCELLED not terminal** | every webhook + every poll | out-of-order attempts on one order | none (code only) |
| **B. Opportunistic heal** | a user or admin looks at the purchase | the user-visible symptom, instantly | none (piggybacks on page loads) |
| **C. In-process sweep** | a timer inside the app, every ~3 min while the server is awake | abandoned sessions (coupon count, invoice) nobody is looking at | none (`instrumentation.ts`) |

### 2.1 Layer A — already done (Part A)

`src/lib/payment/finalize-purchase.ts`
- `PROMOTABLE_TO_SUCCESS = ["PENDING", "FAILED", "CANCELLED"]`.
- A `SUCCESS` result transitions a row from any of those three; every other
  result still only transitions `PENDING`. A late `FAILED` can never overwrite a
  `SUCCESS`.
- On a `SUCCESS` transition, `failureCode` / `failureReason` left by an earlier
  attempt are cleared.

`src/app/api/v1/payment/reconcile/route.ts`
- The admin single-purchase re-check now also handles `FAILED` / `CANCELLED`.
- The batch sweep gained a pass: recent (< 3 days) `FAILED` / `CANCELLED`
  Cashfree purchases are re-checked; if Cashfree now reports the order paid,
  they finalize.

### 2.2 Layer B — opportunistic heal on page loads

The person who cares about a stuck purchase (the buyer, or an admin on the sales
page) triggers the fix just by loading the page. No new endpoint — reuse
`getPaymentProvider().getOrderStatus()` + `finalizePurchase()`.

**New helper:** `src/lib/payment/heal.ts`

```ts
/**
 * Best-effort reconcile of one purchase against the provider. Safe to call from
 * a page render / request path: never throws, provider-call rate-limited per
 * purchase, and finalizePurchase is idempotent.
 * Returns the (possibly updated) status.
 */
export async function healPurchase(purchaseId: string): Promise<PurchaseStatus>;

/** Same, for every non-settled purchase of one user in the last N days. */
export async function healUserPurchases(userId: string): Promise<void>;
```

- **Non-settled** = `PENDING` or (`FAILED`/`CANCELLED` created < 3 days ago).
  `SUCCESS` / `EXPIRED` / `REFUNDED` are left alone.
- **Rate limit:** reuse the pattern already in
  `verify/[orderId]/route.ts` — an in-memory `Map<purchaseId, lastPolledAt>`,
  min 3s between provider calls for the same purchase (Cashfree guidance,
  `common-mistakes` §F2). Lift that map into `heal.ts` so both callers share it.
- **Never blocks the page:** wrap in `try/catch`, and cap total work (e.g. at
  most 3 provider calls per page load; the rest wait for Layer C).

**Call sites:**

| File | Change |
|---|---|
| `src/app/purchase/[orderId]/return/page.tsx` | before rendering, `await healPurchase(purchaseId)` (server component) so a returning buyer sees the right card immediately; the existing `PendingPoller` stays as the live follow-up |
| `src/app/api/v1/purchase/verify/[orderId]/route.ts` | already does this for `PENDING`; widen to call `healPurchase` (which covers FAILED/CANCELLED too) and drop its local throttle map in favour of the shared one |
| `src/app/dashboard/student/purchases/page.tsx` | `await healUserPurchases(session.user.id)` before the query, so "My Purchases" is self-correcting on every visit |
| `src/app/dashboard/admin/sales/page.tsx` | optional: `healUserPurchases` is per-user; for admin add a light "heal the visible non-settled rows" pass (bounded, same helper) |

### 2.3 Layer C — in-process sweep (`src/instrumentation.ts`)

Next.js 16 runs a persistent Node server (`next start`) on Render — not
serverless — so the app can run its own timer.

**New file:** `src/instrumentation.ts`

```ts
export async function register() {
  // Guard: only the Node.js server runtime, never Edge, never build.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.PAYMENT_SELF_HEAL_SWEEP === "off") return;

  const INTERVAL_MS = 3 * 60_000;
  const { runReconcileSweep } = await import("@/lib/payment/reconcile-core");

  const tick = async () => {
    try {
      await runReconcileSweep({ source: "in-process-timer" });
    } catch (err) {
      console.error("self-heal sweep failed", err);
    }
  };

  // Not immediately on boot — let the server settle first.
  setTimeout(tick, 30_000);
  setInterval(tick, INTERVAL_MS);
}
```

**Refactor:** extract the batch body of
`src/app/api/v1/payment/reconcile/route.ts` into
`src/lib/payment/reconcile-core.ts` (`runReconcileSweep()`), so both the HTTP
route (admin button) and the timer call the same code. The route becomes a thin
auth wrapper around it. `docs/CASHFREE-PLAN.md`'s crontab section stays valid as
an *optional* extra trigger for anyone who wants one.

**Guards (multi-instance / restart safety):**
- **Distributed lock via `PaymentEvent`:** before a sweep, write a marker row
  `provider="system", eventId="sweep-lock:<epoch-rounded-to-2min>",
  eventType="RECONCILE_SWEEP_LOCK"`. The `@@unique([provider, eventId])` means
  only one instance per 2-minute bucket wins; the loser catches `P2002` and
  skips. No schema migration — reuses the existing table.
- All work is idempotent anyway (`finalizePurchase`, `ensureInvoice`), so a
  double-run is harmless — the lock is just noise reduction.
- **Render free-tier sleep:** when the web service is idle it spins down and the
  timer pauses. Acceptable: no traffic ⇒ no new payments, and the next request
  wakes the server (and Layer B heals anything the waking user looks at). On a
  paid always-on instance the timer is fully reliable. Document this; do not
  engineer around it.

## 3. Config

New env var (optional):

```
PAYMENT_SELF_HEAL_SWEEP=""    # always on (dev + prod); set "off" to disable — only switch
```

The Layer C timer runs in every environment (still only in the Node.js server
runtime, never Edge/build). `.env.example` updated. No new secret. Layers A and
B have no config.

## 4. What this explicitly does NOT add

- No Render Cron Job service.
- No GitHub Actions workflow.
- No third-party pinger (cron-job.org, UptimeRobot, …).
- No schema migration (the sweep lock reuses `PaymentEvent`).
- No new queue / Redis / background-worker dependency.

## 5. Rollout

1. **Part A** (§ 2.1) — done. `finalize-purchase.ts` + `reconcile` route.
2. **Layer B** — done. `src/lib/payment/heal.ts` (`healPurchase`,
   `healUserPurchases`, `healPurchaseIds`) wired into the return page, the
   verify route, "My Purchases", and the admin sales page.
3. **Layer C** — done. `src/lib/payment/reconcile-core.ts`
   (`runReconcileSweep`, `reconcileSinglePurchase`) + `src/instrumentation.ts`
   timer + `PAYMENT_SELF_HEAL_SWEEP`. The reconcile route is now a thin auth
   wrapper.
4. **One-time repair** of order `90f9e7ad-f075-4392-86bc-dd38b14d3d84` — done
   manually (direct DB update to `SUCCESS` + payment fields). Its invoice is
   still missing; the next admin "Reconcile pending" click, or the Layer C
   timer, generates it via the `missingInvoices` pass.
5. **Ship** the branch and verify in production (§ 6).

## 6. Testing

**Layer A** (mock provider, `MOCK_PAYMENT_OUTCOME`):
- Force a purchase to `FAILED`, then deliver a `SUCCESS` for the same order →
  row becomes `SUCCESS`, invoice created, coupon `usedCount` +1 exactly once.
- Deliver a late `FAILED` for a `SUCCESS` row → no change.

**Layer B:**
- Leave a purchase `PENDING` with the provider actually reporting `PAID`; load
  `/purchase/<id>/return` → card shows success on first paint (no poll wait).
- Same via "My Purchases".
- Hammer refresh → provider called at most once per 3s per purchase (check
  `PaymentEvent` `RECONCILE_POLL` rows / logs).

**Layer C:**
- Boot the app, wait ~30s + one interval, confirm a `RECONCILE_SWEEP_LOCK`
  `PaymentEvent` row appears and stale orders resolve.
- Boot two instances locally → only one sweep runs per 2-min bucket (`P2002` on
  the lock for the other).
- `PAYMENT_SELF_HEAL_SWEEP=off` → no timer, no lock rows. Any other value (incl. unset) → timer runs.

**Production smoke:** after deploy, one real ₹1–125 purchase; kill the webhook
mid-flow (or just wait); confirm the site self-corrects within one sweep
interval without anyone touching the admin button.

## 7. Files (as implemented)

| File | New / changed |
|---|---|
| `src/lib/payment/finalize-purchase.ts` | changed — `PROMOTABLE_TO_SUCCESS`, failure fields cleared on SUCCESS |
| `src/lib/payment/reconcile-core.ts` | **new** — `runReconcileSweep`, `reconcileSinglePurchase`, `acquireSweepLock`, `MAX_RECONCILE_ATTEMPTS` |
| `src/app/api/v1/payment/reconcile/route.ts` | rewritten — thin auth wrapper over `reconcile-core` |
| `src/lib/payment/heal.ts` | **new** — `healPurchase`, `healUserPurchases`, `healPurchaseIds` |
| `src/instrumentation.ts` | **new** — Layer C timer |
| `src/app/purchase/[orderId]/return/page.tsx` | changed — `await healPurchase` before paint |
| `src/app/api/v1/purchase/verify/[orderId]/route.ts` | changed — delegates to `healPurchase`, local throttle removed |
| `src/app/dashboard/student/purchases/page.tsx` | changed — `await healUserPurchases` before listing |
| `src/app/dashboard/admin/sales/page.tsx` | changed — `healPurchaseIds` on visible non-settled rows; "Re-check" button now also on FAILED/CANCELLED |
| `.env.example` | changed — `PAYMENT_SELF_HEAL_SWEEP`, `CRON_SECRET` note |
| `docs/CASHFREE-PLAN.md` | changed — FAILED/CANCELLED not terminal; crontab now optional |
| `docs/RTM.md` | changed — new "Cashfree Payment Integration" section |

## 8. New `PaymentEvent` rows this introduces

| `provider` | `eventType` | `eventId` | meaning |
|---|---|---|---|
| `system` | `RECONCILE_SWEEP_LOCK` | `sweep-lock:<2min-bucket>` | one row per sweep window — the cross-instance lock |
| provider | `RECONCILE_POLL` | `poll:<purchaseId>:<uuid>` | one row per provider poll (unchanged) |
