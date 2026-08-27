# Cashfree Integration Plan (Follow-up to Phase 1)

## Context

Phase 1 shipped a **pluggable payment-provider abstraction** with a mock provider
standing in for a real gateway (see `docs/PLAN.md` § "Payment Provider Abstraction",
`docs/HLD.md` § 4). The purchase → finalize → invoice → coupon-accounting → watermarked-download
chain is fully built and tested against `MockPaymentProvider`. This plan is the
**separate, later effort** that was explicitly deferred: dropping real Cashfree in
behind the same `PaymentProvider` interface.

**Guiding constraint (unchanged):** nothing outside `src/lib/payment/` and a new
webhook route should need to change. If this plan starts touching pricing, invoice
generation, the return page's UX, or `finalizePurchase()`'s transition logic, stop —
that's a sign the seam is being bypassed.

**Cashfree stays out of scope until this plan is explicitly being executed.** Per
root `CLAUDE.md` § "Payment provider", do not add real gateway calls before then.

## What Phase 1 already gives us (the seam)

| File | Role | Changes in this plan? |
|---|---|---|
| `src/lib/payment/provider.ts` | `PaymentProvider` interface + result types | **Yes** — extend (see § 2) |
| `src/lib/payment/mock-provider.ts` | Instant-success mock | Yes — implement the new interface methods trivially |
| `src/lib/payment/index.ts` | `getPaymentProvider()` env switch | Yes — register `"cashfree"` case |
| `src/lib/payment/finalize-purchase.ts` | Idempotent SUCCESS/FAILED application | **No** — reused as-is |
| `src/app/api/v1/purchase/create-order/route.ts` | Creates `PENDING` Purchase, calls `provider.createOrder()` | Minimal — see § 4 |
| `src/app/api/v1/purchase/verify/[orderId]/route.ts` | Fallback status poll | Yes — route through new `getOrderStatus()` |
| `src/app/purchase/[orderId]/return/page.tsx` | Post-payment landing, also polls as fallback | Minimal — see § 4 |
| `prisma/schema.prisma` `Purchase` model | `providerOrderId` (unique), `providerPaymentId`, `paymentMethod`, `status` | **No** — fields already sufficient |

The `Purchase` model already carries everything Cashfree needs: `providerOrderId`
(we'll store Cashfree's `order_id`), `providerPaymentId` (Cashfree `cf_payment_id`),
`paymentMethod` (card / upi / netbanking), and a `PENDING → SUCCESS/FAILED` status
machine that `finalizePurchase()` drives idempotently.

## 1. Cashfree flow we're targeting

Cashfree's current integration model is **Orders API + hosted/drop-in checkout via a
`payment_session_id`**, not a plain redirect URL:

1. Server calls `POST https://api.cashfree.com/pg/orders` (sandbox: `sandbox.cashfree.com`)
   with `order_amount` (rupees, 2-decimal — **convert from paise**), `order_currency: "INR"`,
   `order_id` (our own unique id), `customer_details`, and `order_meta.return_url`.
2. Response gives `payment_session_id` + `order_id`.
3. Client loads `@cashfreepayments/cashfree-js`, calls `cashfree.checkout({ paymentSessionId, redirectTarget: "_self" })`.
   Cashfree hosts the payment UI and redirects back to `return_url` when done.
4. **Webhook** `POST /api/v1/payment/cashfree/webhook` fires with the authoritative
   result (signature-verified) → `finalizePurchase()`.
5. **Fallback**: the return page and `verify/[orderId]` route call
   `GET /pg/orders/{order_id}` / `GET /pg/orders/{order_id}/payments` to resolve
   status if the webhook is late.

Webhook is the source of truth; the return-page poll is only a UX fallback so the
student isn't stuck on "processing" if the webhook is delayed.

## 2. Interface changes (`src/lib/payment/provider.ts`)

The current interface assumes a redirect URL and a single `handleCallback(payload)`.
Cashfree needs (a) a session token for the JS SDK, and (b) two distinct "what's the
result" paths — a signed webhook payload vs. a poll by order id. Extend, don't break:

```ts
export type CreateOrderResult = {
  providerOrderId: string;
  // Mock returns only redirectUrl. Cashfree returns sessionId (+ optional redirectUrl unused).
  redirectUrl?: string;
  sessionId?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createOrder(purchase: PurchaseForOrder): Promise<CreateOrderResult>;

  /** Verify + parse an inbound provider webhook. Returns null if signature invalid. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<CallbackResult | null>;

  /** Poll the provider for an order's current status (fallback when webhook is late). */
  getOrderStatus(providerOrderId: string): Promise<CallbackResult>;
}
```

- Drop `handleCallback(payload: unknown)` — split into `verifyWebhook` (webhook route)
  and `getOrderStatus` (return page + verify route). Update the two call sites.
- `MockPaymentProvider`: `createOrder` returns `{ redirectUrl }` as today;
  `verifyWebhook` returns `{ status: "SUCCESS", ... }` unconditionally;
  `getOrderStatus` returns `{ status: "SUCCESS", ... }`. Mock behaviour unchanged.
- `CallbackResult` stays as-is (`providerOrderId`, `status`, `providerPaymentId?`).
  Consider adding `paymentMethod?: string` so `finalizePurchase` can persist it —
  that's a one-line additive change to the finalizer's `update` data, acceptable.

## 3. New files

### `src/lib/payment/cashfree-client.ts`
Thin fetch wrapper around the Cashfree PG REST API. No SDK on the server (their
Node SDK is heavy and mostly a fetch wrapper anyway).
- Base URL from `CASHFREE_ENV` (`sandbox` | `production`).
- Headers: `x-client-id`, `x-client-secret`, `x-api-version: 2023-08-01`.
- `createOrder(...)`, `getOrder(orderId)`, `getOrderPayments(orderId)`.
- Timeout + one retry on network error; throw a typed `CashfreeApiError` otherwise.

### `src/lib/payment/cashfree-provider.ts`
Implements `PaymentProvider`:
- `createOrder`: paise → rupees (`amount / 100`, `.toFixed(2)`), build `customer_details`
  (`customer_id` = our user id, `customer_email`, `customer_phone` — see § 6 open
  question), `order_meta.return_url = ${NEXTAUTH_URL}/purchase/{purchaseId}/return`.
  Return `{ providerOrderId: order_id, sessionId: payment_session_id }`.
- `verifyWebhook`: recompute `HMAC-SHA256(timestamp + rawBody, CASHFREE_WEBHOOK_SECRET)`,
  base64, constant-time compare against `x-webhook-signature`. Map Cashfree
  `PAYMENT_SUCCESS_WEBHOOK` / `PAYMENT_FAILED_WEBHOOK` / `PAYMENT_USER_DROPPED_WEBHOOK`
  event types → `SUCCESS` / `FAILED`. Extract `cf_payment_id`, `payment_group`.
- `getOrderStatus`: `getOrder(orderId)` → `order_status` (`PAID` → SUCCESS,
  `EXPIRED`/`TERMINATED` → FAILED, `ACTIVE` → still PENDING → return a
  `status: "FAILED"`? No — need a third state). **Decision:** `getOrderStatus`
  returns `CallbackResult | { status: "PENDING" }`; callers already guard on
  `purchase.status === "PENDING"` and can treat a PENDING result as "do nothing yet".

### `src/app/api/v1/payment/cashfree/webhook/route.ts`
- `export const runtime = "nodejs"` (needs raw body + crypto).
- Read `await request.text()` **before** any parsing — signature is over the raw body.
- `const result = await getPaymentProvider().verifyWebhook(raw, request.headers)`.
- `if (!result) return new Response("invalid signature", { status: 401 })`.
- `await finalizePurchase(result)` — already idempotent, safe for Cashfree's
  at-least-once delivery and retries.
- Always return `200` on a verified webhook even if the purchase is already finalized
  (so Cashfree stops retrying). Return `4xx` only on signature failure / unknown order.
- No auth guard — this is a server-to-server endpoint, protected by signature only.
  Add the path to `src/proxy.ts`'s public matcher exclusions if needed.

## 4. Changes to existing purchase flow

### `create-order/route.ts`
Currently generates a placeholder `providerOrderId` then patches it after
`createOrder()`. Keep that shape. Only change: response now forwards `sessionId`
alongside `redirectUrl`:
```ts
return NextResponse.json({
  redirectUrl: orderResult.redirectUrl ?? null,
  sessionId: orderResult.sessionId ?? null,
  purchaseId: purchase.id,
});
```
Consider generating our own `order_id` up front (`ord_{cuid}`) and passing it *into*
`createOrder` so there's no window where `providerOrderId` is a throwaway value —
minor robustness improvement, optional.

### `purchase-card.tsx` (client)
Today: `router.push(body.redirectUrl)`. `router.push` only does SPA navigation —
fine for the mock's internal URL, **wrong for an external gateway**. New logic:
```ts
if (body.sessionId) {
  const { load } = await import("@cashfreepayments/cashfree-js");
  const cashfree = await load({ mode: process.env.NEXT_PUBLIC_CASHFREE_ENV });
  await cashfree.checkout({ paymentSessionId: body.sessionId, redirectTarget: "_self" });
} else if (body.redirectUrl) {
  router.push(body.redirectUrl); // mock path, unchanged
}
```
Needs `NEXT_PUBLIC_CASHFREE_ENV` (`sandbox` | `production`) — the only public env var.

### `purchase/[orderId]/return/page.tsx` and `verify/[orderId]/route.ts`
Replace `provider.handleCallback({ providerOrderId })` with
`provider.getOrderStatus(purchase.providerOrderId)`, and only call
`finalizePurchase()` when the result is not PENDING. Add a small client-side
poll-with-backoff on the return page (3–4 tries over ~10s) for the case where the
student lands before the webhook — today it's a single server-render check.

## 5. Environment variables

Add to `.env.example`:
```
# Cashfree (only used when PAYMENT_PROVIDER=cashfree)
CASHFREE_ENV="sandbox"                 # sandbox | production
CASHFREE_CLIENT_ID=""
CASHFREE_CLIENT_SECRET=""
CASHFREE_WEBHOOK_SECRET=""             # from the Cashfree dashboard webhook config
NEXT_PUBLIC_CASHFREE_ENV="sandbox"     # must match CASHFREE_ENV; exposed to the browser
```
`getPaymentProvider()` should throw a clear startup error if `PAYMENT_PROVIDER=cashfree`
and any of the server vars are missing.

## 6. Open questions for the client

1. **Customer phone** — Cashfree's Orders API historically required `customer_phone`.
   The current `User` model has no phone field. Options: (a) collect phone at checkout,
   (b) add it to registration, (c) send a placeholder `"0000000000"` if Cashfree's
   current API version allows it. Needs a schema migration if (a)/(b).
2. **Cashfree account + KYC** — production `client_id`/`secret` and webhook secret come
   from the client's own Cashfree merchant account. Sandbox creds are enough to build
   and test everything here.
3. **Settlement / refunds** — refund automation is explicitly out of scope (BRD FR-15).
   Refunds stay manual via the Cashfree dashboard for now.
4. **Return URL host** — needs a stable public `NEXTAUTH_URL` (the VPS domain + SSL,
   already part of Phase 1 deployment step 7).

## 7. Build order

1. Extend `PaymentProvider` interface; update `MockPaymentProvider` + the 2 call sites
   in `verify` route and `return` page; run existing purchase tests — **mock flow must
   stay green with zero behaviour change.**
2. `cashfree-client.ts` + unit tests against recorded sandbox responses.
3. `cashfree-provider.ts` — `createOrder` + `getOrderStatus` first.
4. Webhook route + `verifyWebhook`, with a signature-verification unit test using a
   known-good payload/secret pair from Cashfree's docs.
5. Register `"cashfree"` in `getPaymentProvider()` + env validation.
6. Client checkout in `purchase-card.tsx` + return-page poll-with-backoff.
7. End-to-end sandbox test: card success, UPI success, user-dropped, webhook-late
   (block the webhook, confirm the fallback poll finalizes), duplicate webhook
   (confirm `finalizePurchase` no-ops), signature-tamper (confirm 401).
8. Update `docs/HLD.md` § 4, `docs/RTM.md` (FR-17 moves from "deferred" to
   "Implemented/Verified"), `docs/BRD.md` § 5 out-of-scope list, and root `CLAUDE.md`
   § "Payment provider".
9. Deploy: set `PAYMENT_PROVIDER=cashfree` + real creds in production env, configure
   the webhook URL in the Cashfree dashboard, one production smoke-test purchase +
   immediate manual refund.

## 8. Test matrix

| Scenario | Expected |
|---|---|
| Card payment success | webhook → `SUCCESS`, invoice generated, coupon `usedCount++`, download unlocked |
| UPI payment success | same |
| User drops payment | webhook → `FAILED`, no invoice, no coupon increment, return page shows failure |
| Webhook arrives before return-page load | purchase already `SUCCESS` on landing |
| Webhook late / never | return-page poll calls `getOrderStatus`, finalizes from `PAID` order status |
| Duplicate webhook delivery | 2nd call is idempotent no-op (`status !== "PENDING"` guard) |
| Tampered / missing signature | `verifyWebhook` returns null → 401, purchase stays `PENDING` |
| Amount mismatch (order vs. Purchase.amount) | webhook handler rejects, logs, leaves `PENDING` |
| `PAYMENT_PROVIDER=cashfree` with missing creds | `getPaymentProvider()` throws at startup |
| Coupon exhausted between create-order and webhook | already handled — coupon re-validated at create-order, `usedCount` capped in finalize |

## Out of scope for this plan

- Refund automation, settlement reconciliation, payout dashboards (BRD FR-15).
- Saved cards / tokenization, EMI, pay-later, international cards.
- Multiple concurrent providers or per-bank provider selection — single global
  `PAYMENT_PROVIDER` stays.
- Subscriptions / recurring (Cashfree "Subscriptions" product) — Phase 2.
