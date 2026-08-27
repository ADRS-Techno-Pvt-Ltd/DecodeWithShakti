# Cashfree Integration Plan — Full Payment State Machine (Follow-up to Phase 1)

## Context

Phase 1 shipped a `PaymentProvider` seam with `MockPaymentProvider` behind it
(`src/lib/payment/`), and the whole purchase chain — create-order → finalize →
invoice → coupon accounting → watermarked download — works end to end against
the mock. An earlier draft of this document sketched the real integration but
left three things unresolved that matter more than the API wiring itself:

1. **There was no PENDING result state.** `CallbackResult.status` was only
   `SUCCESS | FAILED`, so an order Cashfree reports as still `ACTIVE` had
   nowhere to go. The earlier draft said verbatim: *"`ACTIVE` → still PENDING →
   return a `status: "FAILED"`? No — need a third state."*
2. **Nothing resolved a stuck order.** If the webhook never arrives and the
   student closes the tab, the `Purchase` row would stay `PENDING` forever, the
   coupon would never be counted, and no invoice would exist — even though the
   card was charged.
3. **Payment could be bypassed.** `purchase/[orderId]/return/page.tsx`
   *finalizes the purchase as a side effect of a GET render*, calling
   `provider.handleCallback()`, which for the mock returns `SUCCESS`
   unconditionally. Anyone who creates an order and loads their own return URL
   gets the PDF for free today. That is correct-by-accident only because the
   provider is a mock; with a real gateway the return page must never be
   authoritative.

This plan implements Cashfree **and** closes all three, defining exactly what
happens on success, failure, user cancellation, pending, stuck, and bypass
attempts.

**Guiding constraint (unchanged from the earlier draft):** gateway specifics
stay inside `src/lib/payment/`. Pricing (`lib/pricing.ts`), invoice generation
(`lib/invoice.ts`), watermarking, and the download route are not touched.

**Checked against the official Cashfree integration skills**
(`.claude/skills/pg/*`, `getting-started`, `common-mistakes`,
`validation-and-testing`), which caught several inaccuracies in the earlier
draft:
- Server-side: use the official `cashfree-pg` npm SDK (`PGCreateOrder`,
  `PGFetchOrder`, `PGFetchOrderPayments`, `PGVerifyWebhookSignature`), not a
  hand-rolled fetch client. The SDK's `XApiVersion` defaults to an
  unpublished `"2026-01-01"` — pin it to `"2025-01-01"` explicitly.
- Client-side: the current web SDK is **Cashfree.js v3**, loaded via
  `<script src="https://sdk.cashfree.com/js/v3/cashfree.js">` and initialized
  once as `Cashfree({ mode })` — there is no `@cashfreepayments/cashfree-js`
  npm package for this. The earlier draft's snippet was wrong.
- `cashfree.checkout()` resolves with **three** states (`error`, `redirect`,
  `paymentDetails`), not a single success/fail signal — `result.error` fires
  for a closed modal too, which is not the same as a failed payment.
- Cashfree's `order_status` (from `GET /orders/{id}`) is only
  `PAID | ACTIVE | EXPIRED` — there is no `TERMINATED`. Distinguishing
  FAILED from CANCELLED when polling (as opposed to via webhook `type`)
  requires reading the latest payment attempt's `payment_status` from
  `GET /orders/{id}/payments`, not the order status alone.
- Webhook idempotency header is `x-idempotency-key` (webhook version
  `2025-01-01`), not `x-webhook-id`.
- Never branch on `error_description` — only `error_code` / `error_reason` /
  `error_source` are the stable contract.

---

## 1. The state machine (the core of this plan)

```
                        create-order
                             │
                             ▼
                      ┌─────────────┐
          ┌───────────│   PENDING   │───────────┐
          │           │ expiresAt=T │           │
          │           └─────────────┘           │
          │                  │                  │
  webhook │          webhook │          sweep / poll after T
  PAYMENT │          PAYMENT_│                  │
  SUCCESS │          FAILED  │  USER_DROPPED    │
          ▼                  ▼        ▼         ▼
    ┌──────────┐      ┌──────────┐ ┌───────────┐ ┌──────────┐
    │ SUCCESS  │      │  FAILED  │ │ CANCELLED │ │ EXPIRED  │
    └──────────┘      └──────────┘ └───────────┘ └──────────┘
      terminal          retryable    retryable     retryable
      + invoice         (new order)  (new order)   (new order)
      + coupon++
      + download
          │
          │ manual refund in Cashfree dashboard,
          │ reconciled by sweep
          ▼
    ┌──────────┐
    │ REFUNDED │  terminal, access revoked
    └──────────┘
```

**Authority rule:** only two things may write a terminal status —
the signature-verified webhook, and `getOrderStatus()` polled directly from
Cashfree's API. Never the browser, never a URL parameter, never a page render
that trusts its own query string.

### Status-by-status behaviour

| Status | Trigger | Purchase row | Coupon | Invoice | Download | Student sees | Retry allowed |
|---|---|---|---|---|---|---|---|
| **PENDING** | `create-order` succeeded, order placed with Cashfree | `status=PENDING`, `expiresAt=now+20min` | not counted | none | 403 | Return page polls with backoff: *"Confirming your payment…"* | n/a |
| **SUCCESS** | `PAYMENT_SUCCESS_WEBHOOK`, or poll sees `order_status=PAID` **and** amount matches | `SUCCESS`, `providerPaymentId`, `paymentMethod` | `usedCount++` | generated + uploaded | allowed | Success card, invoice + download links | no (409 "already own") |
| **FAILED** | `PAYMENT_FAILED_WEBHOOK`, or poll's latest payment attempt has `payment_status=FAILED` | `FAILED`, `failureCode` + `failureReason` from Cashfree | not counted | none | 403 | Failure card with the gateway's reason + **Try again** | yes — new order |
| **CANCELLED** | `PAYMENT_USER_DROPPED_WEBHOOK`, or poll's latest attempt has `payment_status=USER_DROPPED` | `CANCELLED` | not counted | none | 403 | *"You cancelled this payment"* + **Try again** | yes — new order |
| **EXPIRED** | Sweep finds `PENDING` past `expiresAt` and Cashfree's `order_status=EXPIRED` (or still `ACTIVE` past expiry) | `EXPIRED` | not counted | none | 403 | *"This checkout expired"* + **Start over** | yes — new order |
| **REFUNDED** | Sweep sees `REFUNDED`/`PARTIALLY_REFUNDED` on a `SUCCESS` order | `REFUNDED`, `refundedAt` | `usedCount--` (floored at 0) | invoice retained (tax record) | **403 — revoked** | *"Refunded"* row, invoice still downloadable | yes — new order |
| **HELD (amount mismatch)** | Webhook amount ≠ `Purchase.amount` | stays `PENDING`, `heldForReview=true`, event logged | not counted | none | 403 | Still "Confirming…" | no — admin must resolve |

**Stuck, precisely defined.** A purchase is stuck when `status=PENDING` and
`now > expiresAt`. The sweep resolves every such row by asking Cashfree, so
"stuck" is a transient condition with a bounded lifetime (≤ one sweep interval),
not a permanent state. Cases the sweep handles:

- Cashfree `order_status=PAID` → treat exactly like a late webhook:
  `finalizePurchase(SUCCESS)`. This is the money-critical path — the student
  was charged, the webhook was lost, and the sweep is what grants access.
- Cashfree `order_status=EXPIRED`, or still `ACTIVE` past our `expiresAt` → `EXPIRED`.
- Cashfree `order_status=ACTIVE` but the latest entry from
  `GET /orders/{id}/payments` has `payment_status=FAILED` → `FAILED`;
  `payment_status=USER_DROPPED` → `CANCELLED`. (`order_status` alone only
  distinguishes `PAID` / `ACTIVE` / `EXPIRED` — it has no failed/dropped
  state; that granularity lives on the payment attempt, not the order.)
- Cashfree 5xx / network error → leave `PENDING`, increment `reconcileAttempts`,
  retry next sweep. After 10 attempts, set `heldForReview=true` and surface it
  in the admin UI rather than guessing.

---

## 2. Schema changes (`prisma/schema.prisma`)

One migration. `Purchase` already carries `providerOrderId @unique`,
`providerPaymentId`, `paymentMethod`, `paymentProvider` — those stay.

```prisma
enum PurchaseStatus {
  PENDING
  SUCCESS
  FAILED
  CANCELLED   // new
  EXPIRED     // new
  REFUNDED    // new
}

model Purchase {
  // ...existing fields unchanged...
  expiresAt         DateTime?   // new — set at create-order (now + 20 min)
  failureCode       String?     // new — Cashfree error_reason (stable, e.g. "insufficient_funds") — for filtering
  failureReason     String?     // new — Cashfree error_description — display/log only, never branched on
  heldForReview     Boolean  @default(false)  // new — amount mismatch or repeated poll failure
  reconcileAttempts Int      @default(0)      // new
  refundedAt        DateTime?                 // new

  @@index([status, expiresAt])   // new — the sweep's query
  @@index([userId, questionBankId, status])  // new — the "already owned" check, currently unindexed
}

model User {
  // ...existing fields...
  phone String?   // new — collected at checkout, required by Cashfree Orders API
}

/// Append-only audit of every inbound provider event. Doubles as the
/// idempotency ledger: a duplicate (provider, eventId) is rejected by the
/// unique constraint before finalizePurchase is ever called.
model PaymentEvent {
  id                String   @id @default(cuid())
  provider          String
  eventId           String   // Cashfree x-idempotency-key (webhook version 2025-01-01), or "poll:<uuid>" for sweeps
  eventType         String   // PAYMENT_SUCCESS_WEBHOOK | ... | RECONCILE_POLL
  purchaseId        String?
  purchase          Purchase? @relation(fields: [purchaseId], references: [id])
  providerOrderId   String?
  signatureValid    Boolean  @default(false)
  rawPayload        Json
  processedAt       DateTime?
  error             String?
  receivedAt        DateTime @default(now())

  @@unique([provider, eventId])
  @@index([providerOrderId])
}
```

Existing rows: all current statuses remain valid, so the migration is additive
and needs no data backfill. `expiresAt` is null on historical rows — the sweep
query must use `expiresAt != null AND expiresAt < now()` so old mock purchases
are never touched.

---

## 3. Provider interface (`src/lib/payment/provider.ts`)

Replace `handleCallback(payload)` with a webhook path and a poll path, and add
the missing PENDING state:

```ts
export type PaymentOutcome =
  | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED" | "PENDING" | "REFUNDED";

export type CallbackResult = {
  providerOrderId: string;
  status: PaymentOutcome;
  providerPaymentId?: string;
  paymentMethod?: string;      // upi | card | netbanking | wallet
  paidAmount?: number;         // paise — verified against Purchase.amount
  failureCode?: string;        // Cashfree error_reason — stable, filterable (e.g. "insufficient_funds")
  failureReason?: string;      // Cashfree error_description — display/log only, NEVER branched on (common-mistakes §C4)
  eventId?: string;            // x-idempotency-key for webhooks, "poll:<uuid>" for sweeps — for PaymentEvent dedupe
  eventType?: string;
  rawPayload?: unknown;
};

export type CreateOrderResult = {
  providerOrderId: string;
  redirectUrl?: string;   // mock only
  sessionId?: string;     // Cashfree payment_session_id
  expiresAt?: Date;
};

export type PurchaseForOrder = {
  id: string;
  amount: number;
  userId: string;          // new — Cashfree customer_id
  userEmail: string;
  userPhone: string;       // new
  questionBankTitle: string;
  returnUrl: string;       // new — built by the caller from NEXTAUTH_URL
};

export interface PaymentProvider {
  readonly name: string;
  createOrder(purchase: PurchaseForOrder): Promise<CreateOrderResult>;
  /** null = signature invalid. Never throw on a bad signature. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<CallbackResult | null>;
  getOrderStatus(providerOrderId: string): Promise<CallbackResult>;
}
```

`MockPaymentProvider` implements all three. Give it a **deliberate failure hook**
so every branch above is testable without a gateway: read a
`MOCK_PAYMENT_OUTCOME` env var (`success` default, or `failed` / `cancelled` /
`pending`) and return that outcome. This is what makes the pending/stuck/expired
paths developable locally.

---

## 4. Rewrite `finalizePurchase` (`src/lib/payment/finalize-purchase.ts`)

The current version has three real defects that this plan must fix, because
Cashfree's at-least-once webhook delivery will hit all of them:

- **The idempotency guard is outside the transaction** (lines 19–21): two
  concurrent webhook deliveries can both read `PENDING` and both proceed —
  double coupon increment, duplicate invoice.
- **Invoice number races** — `prisma.invoice.count() + 1` (line 46) collides on
  the `@unique invoiceNumber` under any concurrency.
- **Invoice generation is outside the transaction and unretryable** — if
  Cloudinary fails, the purchase is `SUCCESS` with no `Invoice` row, and the
  `status !== "PENDING"` guard blocks any later attempt forever.

New shape:

```ts
export async function finalizePurchase(result: CallbackResult): Promise<FinalizeOutcome> {
  if (result.status === "PENDING") return { applied: false, reason: "still-pending" };

  const purchase = await prisma.purchase.findUnique({ where: { providerOrderId: ... } });
  if (!purchase) return { applied: false, reason: "unknown-order" };

  // Amount check BEFORE granting anything.
  if (result.status === "SUCCESS" && result.paidAmount != null
      && result.paidAmount !== purchase.amount) {
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { heldForReview: true, failureReason: `amount mismatch: paid ${result.paidAmount}, expected ${purchase.amount}` },
    });
    return { applied: false, reason: "amount-mismatch" };   // stays PENDING
  }

  await prisma.$transaction(async (tx) => {
    // Conditional update IS the lock: only transitions a row still PENDING.
    const { count } = await tx.purchase.updateMany({
      where: { id: purchase.id, status: "PENDING" },
      data: { status: result.status, providerPaymentId, paymentMethod, failureCode, failureReason },
    });
    if (count === 0) throw new AlreadyFinalized();   // caught + swallowed by caller

    if (result.status === "SUCCESS" && purchase.couponId) {
      await tx.coupon.update({ where: { id: purchase.couponId }, data: { usedCount: { increment: 1 } } });
    }
  });

  if (result.status !== "SUCCESS") return { applied: true };

  await ensureInvoice(purchase.id);   // separate, independently retryable
}
```

- `ensureInvoice(purchaseId)` is idempotent on its own (`Invoice.purchaseId` is
  already `@unique` — upsert against it) and safe to re-run. The reconcile sweep
  calls it for any `SUCCESS` purchase missing an invoice, which repairs the
  Cloudinary-failure case.
- **Invoice numbering** switches to the `Invoice.invoiceSeq` autoincrement column
  that already exists in the schema and is currently unused: insert the row
  first, then format `INV-{year}-{invoiceSeq padded}` from the returned value.
  No count, no race.
- `REFUNDED` is applied from `SUCCESS` (not `PENDING`), so it needs its own
  branch: `updateMany({ where: { id, status: "SUCCESS" } })`, decrement coupon
  `usedCount` floored at 0, keep the invoice.

---

## 5. New files

No hand-rolled fetch client or hand-rolled HMAC — use the official `cashfree-pg`
npm SDK server-side (per `.claude/skills/pg/backend-sdks/SKILL.md`), which
wraps auth, the Orders API, and webhook verification (`PGVerifyWebhookSignature`).

### `src/lib/payment/cashfree-provider.ts`
Constructs one `Cashfree` client instance (module scope, not per-call):
```ts
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
  process.env.CASHFREE_ENV === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY,
);
cashfree.XApiVersion = "2025-01-01"; // pin — SDK's internal default ("2026-01-01") isn't a published API version
```

- `createOrder` → `cashfree.PGCreateOrder(request)`. Paise → rupees
  `(amount / 100).toFixed(2)`, capped at Cashfree's 1,000,000 `order_amount`
  ceiling (validate before calling, don't rely on their 400); `order_id` is our
  own `ord_{purchase.id}` generated *before* the API call (see § 6);
  `customer_details` from `userId` / `userEmail` / `userPhone` (10-digit,
  required); `order_meta.return_url` — static path, Cashfree appends
  `?order_id=...` itself, so **never** interpolate `{order_id}` into a
  template string; `order_expiry_time = now + 20 min`. Returns
  `{ providerOrderId: order_id, sessionId: payment_session_id, expiresAt }`.
- `verifyWebhook(rawBody, headers)`: call the SDK's
  `cashfree.PGVerifyWebhookSignature(headers.get("x-webhook-signature"), rawBody, headers.get("x-webhook-timestamp"))`
  inside a try/catch — it throws on mismatch, so catch → return `null`. Never
  hand-roll the HMAC; the SDK already reads timestamp+rawBody correctly. Then
  `JSON.parse(rawBody)` (only after verification) and map by `payload.type`:
  `PAYMENT_SUCCESS_WEBHOOK` (with `data.payment.payment_status === "SUCCESS"`) → SUCCESS;
  `payment_status === "PENDING"` on that same event type → PENDING (late bank
  authorization — hold, don't finalize); `PAYMENT_FAILED_WEBHOOK` → FAILED;
  `PAYMENT_USER_DROPPED_WEBHOOK` → CANCELLED; `REFUND_STATUS_WEBHOOK` with
  `data.refund.refund_status === "SUCCESS"` → REFUNDED. Extract
  `cf_payment_id`, `payment_group` (→ `paymentMethod`), `payment_amount` (→
  paise, as `paidAmount`), `error_details.error_reason` (→ `failureCode`),
  `error_details.error_description` (→ `failureReason`, display-only — never
  branch on it), and `headers.get("x-idempotency-key")` as `eventId` (webhook
  version must be configured as `2025-01-01` in the dashboard for this header
  to exist).
- `getOrderStatus(providerOrderId)`: `cashfree.PGFetchOrder(orderId)` for
  `order_status` (`PAID | ACTIVE | EXPIRED` — no `TERMINATED`, no failed/dropped
  state at the order level). `PAID` → SUCCESS, pulling `cf_payment_id` +
  `payment_group` from `PGFetchOrderPayments`. `EXPIRED` → EXPIRED. `ACTIVE`:
  call `PGFetchOrderPayments(orderId)`, inspect the latest attempt's
  `payment_status` — `FAILED` → FAILED (with `error_details`), `USER_DROPPED`
  → CANCELLED, anything else (`NOT_ATTEMPTED`, `PENDING`, no attempts yet) →
  PENDING. This two-call shape is required because `order_status` alone can't
  distinguish "still trying" from "user gave up" from "bank declined" — that
  granularity only exists on the payment attempt.

### `src/app/api/v1/payment/cashfree/webhook/route.ts`
```ts
export const runtime = "nodejs";
```
1. `const raw = await request.text()` — **before** any parsing.
2. `verifyWebhook(raw, request.headers)`; `null` → log a `PaymentEvent` with
   `signatureValid: false` and return `401`.
3. Insert the `PaymentEvent` row. A `P2002` unique violation on
   `(provider, eventId)` means this is a redelivery → return `200` immediately,
   do nothing else.
4. `await finalizePurchase(result)`; record `processedAt` / `error` on the event.
5. Return `200` for anything verified — including unknown orders and
   already-finalized ones — so Cashfree stops retrying. `401` only on bad
   signature, `500` only on our own unexpected failure (so Cashfree *does* retry).
6. No session guard; `src/proxy.ts`'s matcher is `["/dashboard/:path*"]`, so the
   route is already outside it — **no `proxy.ts` change is needed**.

### `src/app/api/v1/payment/reconcile/route.ts`
The stuck-order sweep. `POST`, authorized by either a `x-cron-secret` header
matching `CRON_SECRET` (constant-time compare) **or** an admin session, so the
same handler serves the crontab and the admin button.

```
1. PENDING + expiresAt < now  + reconcileAttempts < 10  → getOrderStatus() → finalizePurchase()
2. SUCCESS + no Invoice row                             → ensureInvoice()
3. SUCCESS + last checked > 24h ago (optional pass)     → detect dashboard refunds → REFUNDED
```
Batch limit ~50 per run, sequential with a small delay to stay under Cashfree's
rate limit. Every poll writes a `PaymentEvent` with `eventId: "poll:<uuid>"`.
Returns a JSON summary `{ scanned, resolved: {...}, held, errors }` which the
admin button renders as a toast. Errors on individual rows must not abort the run.

Crontab on the VPS:
```
*/10 * * * * curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/v1/payment/reconcile
```

---

## 6. Changes to existing files

### `create-order/route.ts`
- Generate `providerOrderId = "ord_" + cuid()` **before** creating the row and
  pass it into `createOrder`, removing the current throwaway
  `pending_${Date.now()}_...` value and the follow-up patch `update` (lines 66,
  77–80). Closes the window where a webhook could arrive for an order id not yet
  written to the DB.
- Set `expiresAt` from the provider result.
- **Reap the caller's own stale orders first:** before creating a new `PENDING`
  purchase for this user+bank, expire any existing `PENDING` row past its
  `expiresAt`. Prevents a pile-up of orphans when a student retries repeatedly.
- Require `phone`: accept it in the request body (zod, 10-digit Indian format),
  persist to `User.phone` when provided, and 400 with a
  `{ error: "PHONE_REQUIRED" }` code if the user has none stored.
- Response becomes `{ purchaseId, sessionId, redirectUrl, expiresAt }`.
- If `provider.createOrder()` throws, mark the just-created purchase `FAILED`
  with `failureReason: "order-creation-failed"` rather than leaving it PENDING.

### `purchase-card.tsx`
- Add a phone input, shown only when the session user has no phone on file.
- **Load Cashfree.js v3 via script tag, not an npm import** (`pg/web-sdk/SKILL.md`
  §2 — there is no `@cashfreepayments/cashfree-js` package). Add a tiny loader
  hook, e.g. `src/lib/payment/use-cashfree-sdk.ts`, that injects
  `<script src="https://sdk.cashfree.com/js/v3/cashfree.js">` once (guarded by
  `window.Cashfree` so route re-renders don't double-load) and initializes
  `Cashfree({ mode: process.env.NEXT_PUBLIC_CASHFREE_ENV })` **once at module
  scope**, not inside the click handler — re-instantiating per click is a
  documented mistake (`common-mistakes` §E.5.3).
- Replace `router.push(body.redirectUrl)` (line 126) — SPA navigation cannot
  reach an external gateway, and `checkout()`'s result has **three** terminal
  states that must all be handled (`web-sdk/SKILL.md` §3 — treating only
  `result.error` as "failed" mislabels a closed modal):
  ```ts
  if (body.sessionId) {
    const result = await cashfree.checkout({
      paymentSessionId: body.sessionId,
      redirectTarget: "_modal",   // or "_self" if a full-page redirect is preferred
    });
    if (result.error) {
      // SDK error OR user closed the modal — NOT necessarily a failed payment.
      toast.info("Payment was not completed.");
      router.push(`/purchase/${body.purchaseId}/return`);  // let the server decide the real status
    } else if (result.redirect) {
      return; // navigating to a Cashfree-hosted page (_self/_top) — return_url handler takes over
    } else if (result.paymentDetails) {
      // An attempt was submitted — may have succeeded or failed at the bank.
      router.push(`/purchase/${body.purchaseId}/return`);  // return page backend-verifies, never trust this
    }
  } else if (body.redirectUrl) {
    router.push(body.redirectUrl);   // mock path, unchanged
  }
  ```
- Never infer success client-side from any of the three states — the browser's
  only job is to land on the return page, which polls the backend.

### `purchase/[orderId]/return/page.tsx` — **the bypass fix**
Currently this server component calls `handleCallback()` and finalizes on render
(lines 22–26), which for the mock always grants success. Rewrite:
- The page **never** calls the provider or `finalizePurchase` directly and
  **never** reads `?mock=success` or any query param. It renders the purchase's
  current DB status only.
- If `status === "PENDING"`, render a client polling component that hits
  `GET /api/v1/purchase/verify/[purchaseId]` no faster than every 3s (Cashfree's
  own guidance for async status polling — `common-mistakes` §F2), e.g. 3s, 5s,
  8s, then every 10s up to ~2 min, showing *"Confirming your payment…"*. On a
  terminal status it swaps to the matching card. After the poll budget, show
  *"This is taking longer than usual — we'll email you / check My Purchases"*
  and stop.
- Distinct cards per terminal status per the § 1 table, each with the right CTA
  (Download / Try again / Start over).

### `verify/[orderId]/route.ts`
- Ownership check stays. Replace `handleCallback` with `getOrderStatus`, and only
  call `finalizePurchase` when the result is non-PENDING.
- **Rate limit** it (e.g. 1 provider call per purchase per 3s, tracked in-memory
  or via `Purchase.updatedAt`) — it is now polled in a loop by every return page
  and each call hits Cashfree's `GET /orders` (400/min account limit) +
  `GET /orders/{id}/payments` (100/min account limit) endpoints.
- Response gains `failureCode` and `failureReason` and `heldForReview` so the
  return page can render the right message.

### `src/lib/payment/index.ts` — **provider-selection hardening**
```ts
const provider = process.env.PAYMENT_PROVIDER ?? "mock";
if (process.env.NODE_ENV === "production" && provider === "mock"
    && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
  throw new Error("Refusing to run MockPaymentProvider in production.");
}
```
Register `case "cashfree"`, validating that `CASHFREE_APP_ID`,
`CASHFREE_SECRET_KEY` and `CASHFREE_ENV` are all present and throwing a clear
error naming the missing one. (No separate webhook secret — the installed
`cashfree-pg` SDK's `PGVerifyWebhookSignature` uses `XClientSecret`, i.e.
`CASHFREE_SECRET_KEY`, internally for the HMAC.)

### Other touch points
- `src/app/dashboard/student/page.tsx` — currently renders only SUCCESS vs.
  "Available after payment confirms" (lines 75–100). Add per-status rows for
  FAILED / CANCELLED / EXPIRED (with **Buy again**) and REFUNDED (invoice only,
  no download).
- `src/app/dashboard/admin/sales/page.tsx` — status filter including the new
  values, a `heldForReview` warning badge, a **Reconcile pending** button hitting
  the reconcile route, and a per-row **Re-check payment** action.
- `src/app/api/v1/files/download/[purchaseId]/route.ts` — the guard is
  `status !== "SUCCESS"` (line ~20), which already excludes every new status
  including REFUNDED. **No change needed**; verify with a test rather than
  editing.
- `src/lib/openapi.ts` — add the webhook + reconcile paths and the new
  create-order request/response fields.

---

## 7. Bypass hardening — every "free PDF" vector

| Vector | Defence |
|---|---|
| Load `/purchase/{id}/return?mock=success` directly | Return page no longer finalizes or reads query params; renders DB status only (§ 6) |
| Trust `cashfree.checkout()`'s client-side `result.paymentDetails` as proof of payment | `purchase-card.tsx` never fulfills on any of the 3 result states — it only navigates to the return page, which polls the backend (`common-mistakes` §C1, the single most-violated rule in Cashfree integrations) |
| Forged webhook POST | `cashfree.PGVerifyWebhookSignature()` (SDK, HMAC-SHA256 over raw body + timestamp); throws → caught → `null` → 401, purchase untouched |
| Replayed genuine webhook | `PaymentEvent @@unique([provider, eventId])` rejects it before `finalizePurchase` |
| Race two concurrent webhooks | `updateMany({ where: { status: "PENDING" } })` inside the transaction — exactly one wins |
| Tamper with price in the request body | Body carries only `questionBankId` + `couponCode`; price re-resolved server-side via `resolveEffectivePrice` (already true today) |
| Pay ₹1 for a ₹999 bank via a crafted Cashfree order | `paidAmount !== purchase.amount` → `heldForReview`, stays PENDING, never grants access |
| Download another student's purchase | Existing check `purchase.userId !== session.user.id` in the download route |
| Download after a refund | `REFUNDED` fails the `status === "SUCCESS"` gate |
| Guess a `providerOrderId` | Server-generated (`Purchase.id`, a `randomUUID()` set before the row exists), never client-supplied |
| Mock provider left on in production | `getPaymentProvider()` throws unless `ALLOW_MOCK_PAYMENTS=true` |
| Scrape the public preview endpoint | Out of scope — `files/preview/[id]` is intentionally public but serves the capped preview file only. Worth confirming `previewPageCount` is enforced at generation time. |

---

## 8. Environment variables (`.env.example`)

```
PAYMENT_PROVIDER="mock"              # mock | cashfree
MOCK_PAYMENT_OUTCOME="success"       # success | failed | cancelled | pending (dev only)
ALLOW_MOCK_PAYMENTS=""               # must be "true" to run mock in production

CASHFREE_ENV="sandbox"               # sandbox | production
CASHFREE_APP_ID=""
CASHFREE_SECRET_KEY=""
NEXT_PUBLIC_CASHFREE_ENV="sandbox"   # must match CASHFREE_ENV
CASHFREE_ORDER_EXPIRY_MINUTES="20"

CRON_SECRET=""                       # shared secret for /api/v1/payment/reconcile
```

`NEXTAUTH_URL` must be the real public HTTPS origin — it builds both the
`return_url` and the webhook URL registered in the Cashfree dashboard.

New dependency: `cashfree-pg` (npm, **server-side only** — `src/lib/payment/cashfree-provider.ts`).
The client-side Cashfree.js v3 SDK is loaded via a `<script>` tag at runtime
(`https://sdk.cashfree.com/js/v3/cashfree.js`), not an npm package — nothing
new added to the client bundle.

---

## 9. Build order

1. **Migration + interface first.** Prisma migration (§ 2), extend
   `PaymentProvider` (§ 3), update `MockPaymentProvider` with the
   `MOCK_PAYMENT_OUTCOME` hook, update the two `handleCallback` call sites.
   *Gate: the mock purchase flow still works end to end with zero UX change.*
2. **Rewrite `finalizePurchase`** (§ 4) — transactional guard, `ensureInvoice`,
   `invoiceSeq` numbering, amount check, REFUNDED branch. Still on the mock.
3. **Return page + student dashboard status UI** (§ 6), driven entirely by DB
   status. Exercise every branch by flipping `MOCK_PAYMENT_OUTCOME`.
4. `npm install cashfree-pg`; `cashfree-provider.ts` (`createOrder` +
   `getOrderStatus`, pinned `XApiVersion = "2025-01-01"`).
5. Webhook route + `verifyWebhook` (via `PGVerifyWebhookSignature`) +
   `PaymentEvent` logging, keyed on `x-idempotency-key`.
6. Reconcile route + admin buttons + crontab entry.
7. Phone collection (migration already done in step 1) + client-side script-tag
   loader + `checkout()` call with full 3-state result handling.
8. Register `"cashfree"` in `getPaymentProvider()` with env validation and the
   production mock guard.
9. Configure the webhook in the Cashfree dashboard as version `2025-01-01`,
   subscribed to `PAYMENT_SUCCESS_WEBHOOK` / `PAYMENT_FAILED_WEBHOOK` /
   `PAYMENT_USER_DROPPED_WEBHOOK` / `REFUND_STATUS_WEBHOOK`; whitelist the
   production domain (requires the T&C/Refund/Contact policy pages from
   BRD FR-20 to already be live — the dashboard review checks for them).
10. Sandbox end-to-end pass (§ 10), then docs: `docs/HLD.md` § 4, `docs/RTM.md`
    (FR-17 → Implemented), `docs/BRD.md` § 5, root `CLAUDE.md` § "Payment
    provider".

Steps 1–3 are provider-agnostic and land the entire state machine before any
Cashfree credential exists — worth keeping in that order so the risky part is
last.

---

## 10. Verification

**Local, mock provider** (`PAYMENT_PROVIDER=mock`, no credentials needed) —
flip `MOCK_PAYMENT_OUTCOME` and restart:
- `success` → SUCCESS card, invoice row + PDF, coupon `usedCount` +1, download
  returns a watermarked PDF.
- `failed` / `cancelled` → matching card, **no** invoice, coupon unchanged,
  download 403, **Try again** creates a fresh order.
- `pending` → return page polls and lands on "taking longer than usual";
  purchase stays PENDING with `expiresAt` set. Manually backdate `expiresAt` in
  psql, `curl` the reconcile route, confirm it flips to EXPIRED.

**Bypass checks** (each must fail):
```bash
# 1. forge the mock success URL — must NOT grant access
curl -b "<session cookie>" "http://localhost:3000/purchase/<pendingId>/return?mock=success"
# 2. unsigned webhook — must 401 and leave the purchase PENDING
curl -X POST localhost:3000/api/v1/payment/cashfree/webhook -d '{"type":"PAYMENT_SUCCESS_WEBHOOK"}'
# 3. another user's purchase — must 403
curl -b "<other user cookie>" localhost:3000/api/v1/files/download/<purchaseId>
# 4. reconcile without the secret — must 401
curl -X POST localhost:3000/api/v1/payment/reconcile
```

**Cashfree sandbox** (`PAYMENT_PROVIDER=cashfree`, tunnel the webhook with
`cloudflared`/`ngrok` and register that URL in the dashboard):

| Scenario | Expected |
|---|---|
| Card success | webhook → SUCCESS, invoice, coupon++, download unlocked |
| UPI success | same, `paymentMethod = "upi"` |
| Card declined (test card) | FAILED, `failureCode` = `error_reason` (e.g. `bank_declined`), `failureReason` = `error_description` shown to user |
| Close the checkout window | CANCELLED, **Try again** works |
| Webhook blocked at the tunnel, then return page loaded | poll's `getOrderStatus` finalizes from `PAID` |
| Webhook blocked **and** tab closed, then sweep runs | reconcile finalizes to SUCCESS — the money-critical case |
| Same webhook replayed | 2nd delivery 200s, `PaymentEvent` dedupe, no double invoice |
| Signature tampered | 401, purchase still PENDING |
| Amount mismatch (edit order in sandbox) | `heldForReview=true`, stays PENDING, admin badge shows |
| Refund from the Cashfree dashboard, then sweep | REFUNDED, download 403, invoice still downloadable |
| `PAYMENT_PROVIDER=cashfree` with a missing secret | `getPaymentProvider()` throws naming the var |
| `NODE_ENV=production` + `PAYMENT_PROVIDER=mock` | throws at startup |

Finally `npm run build` must pass, and one production smoke purchase followed by
an immediate manual refund before handing over.

**Go-live gate** (per `validation-and-testing/SKILL.md` — do not call this
"production-ready" until every item is checked, and report status per-item
rather than as a blanket verdict):
- [ ] Production domain whitelisted in the Merchant Dashboard (requires the
  Contact Us / T&C / Refund policy pages — BRD FR-20 — to be live first).
- [ ] Production `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` set; SDK env
  is `CFEnvironment.PRODUCTION`; `NEXT_PUBLIC_CASHFREE_ENV="production"`.
- [ ] `x-client-secret` never reaches the browser (only `payment_session_id` does).
- [ ] Webhook registered in the **production** dashboard at version `2025-01-01`.
- [ ] Backend is the sole source of truth for fulfillment — verified in code
  review, not just by testing the happy path.
- [ ] All payment statuses handled, not just success (§ 1 table).
- [ ] Rate-limit headers respected / backoff in place on the reconcile sweep.

## Out of scope

Refund *automation* (initiating refunds from our UI — BRD FR-15 keeps this
manual in the Cashfree dashboard; we only *reconcile* refunds), settlement
reports, saved cards/tokenization, EMI, international cards, multiple concurrent
providers, subscriptions, and any email notification (chosen: in-app status
only).
