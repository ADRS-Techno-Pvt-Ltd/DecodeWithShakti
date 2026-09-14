# Universal Multi-Item Discount + Cart — Implementation Plan

Status: planned, not yet implemented (Phase 1 not started as of this writing).

## Context

The marketing page currently shows a "CA Final mentorship: Group 1 / Group 2 / Both groups — Save ₹1,499" pricing block, but this is **static hardcoded JSX** ([`(marketing)/page.tsx:653-686`](../src/app/(marketing)/page.tsx#L653-L686)) — not a real `<Link>`, not wired to any product or purchase flow. There is no cart today: the site only supports buying one product at a time (`purchase-card.tsx` → `create-order` API → one `Purchase` row).

The goal is real bundling: when a student adds 2+ qualifying products to an order, a discount kicks in automatically. It must not apply to single-item purchases, and — importantly — it should be a **universal** mechanism (any product, any category), not something special-cased to mentorship, even though mentorship is the motivating case and first real usage.

Decisions confirmed with the user:
- Discount = **percentage off the order total**, applied whenever 2+ qualifying items are in the order (not a fixed override price, not per-item flat amounts).
- **Configured per product type** (Test Series, Question Bank, Mentorship each get their own toggle + percentage in admin) — not one single global switch. Schema/admin UI reflect this from day one.
- Any 2+ products from any category qualify at the cart level (a mentorship-only rule was explicitly ruled out) — but which *percentage* applies depends on the type composition of the cart (see rule below).
- Coupons and the bundle discount are **mutually exclusive** for v1 (bundle discount only applies when no coupon is entered) — avoids stacking/abuse complexity.
- Refunds are **whole-order only** for v1 — refunding one item refunds the entire order; per-item refunds are deferred.
- No cart exists today, so building one is explicitly in scope.

**Which percentage applies (confirmed with user):**
- **Same-type cart** (2+ *distinct* products of one type, e.g. Mentorship Group 1 + Group 2): use that type's own configured percentage, if its toggle is enabled.
- **Mixed-type cart** (items from 2+ different types, e.g. 1 Mentorship + 1 Question Bank): use the **lower** of the involved types' percentages. If any involved type has its toggle disabled, that type effectively contributes 0% — so a mixed cart only gets a non-zero discount when *every* type present has its discount enabled.
- "2+ distinct products of that type" means distinct SKUs, not quantity of the same SKU (these are one-time entitlements; quantity-2-of-same-item isn't really a case here).

Note: per `CLAUDE.md`, Cashfree is currently a **mock** behind a `PaymentProvider` interface — real Cashfree integration is a separate later effort. This plan only builds against the existing `PaymentProvider` abstraction and does not touch real Cashfree-specific code, so none of the Cashfree integration skills/telemetry apply here.

## Architecture decision: layer `Order`/`OrderItem` on top of `Purchase`, don't replace it

`Purchase.id` doubles as `providerOrderId`, and the webhook (`cashfree/webhook/route.ts:50`) looks it up by that unique field. Every downstream consumer — entitlement checks (`alreadyOwned`), invoicing (`ensureInvoice`), mentorship confirmation email, refunds, student dashboard "my purchases" — is keyed on `Purchase`. Replacing it with `Order`/`OrderItem` everywhere would be a big-bang rewrite touching all of those.

Instead: add `Order` (the checkout/payment session) + `OrderItem` (pricing line per product) as new, additive models. A successful multi-item checkout creates **one `Purchase` row per item**, linked via a new nullable `Purchase.orderId`. This means:
- The existing single-item flow (`create-order/route.ts`, `finalize-purchase.ts`, `purchase-card.tsx`, existing webhook branch) needs **zero changes** and keeps working exactly as today.
- Entitlement/invoices/refunds/dashboard all keep working unmodified because they still just see `Purchase` rows.

## A. Data model (`DecodeWithShakti/prisma/schema.prisma`)

Add three things, purely additive (no existing column removed/changed):

```prisma
// One row per ProductType (TEST_SERIES, QUESTION_BANK, MENTORSHIP, ...) — seeded
// with all types disabled/0% on migration, admin turns each on individually.
model PromotionSetting {
  id                       String      @id @default(cuid())
  productType              ProductType @unique
  multiItemDiscountEnabled Boolean     @default(false)
  multiItemDiscountPercent Int         @default(0) // 0-100
  minQualifyingItems       Int         @default(2) // distinct SKUs of this type required to qualify
  updatedAt                DateTime    @updatedAt
}

model Order {
  id                             String         @id @default(cuid()) // == providerOrderId given to payment provider
  userId                         String
  user                           User           @relation(fields: [userId], references: [id])
  status                         PurchaseStatus @default(PENDING) // reuse existing enum
  paymentProvider                String
  providerOrderId                String         @unique
  providerPaymentId               String?
  paymentMethod                  String?
  subtotal                       Int
  couponId                       String?
  coupon                         Coupon?        @relation(fields: [couponId], references: [id])
  couponCodeSnapshot              String?
  couponDiscountAmount            Int            @default(0)
  bundleDiscountPercentSnapshot   Int            @default(0)
  bundleDiscountAmount            Int            @default(0)
  amount                         Int            // authoritative total, checked against paidAmount
  expiresAt                       DateTime?
  failureCode                    String?
  failureReason                  String?
  heldForReview                   Boolean        @default(false)
  reconcileAttempts               Int            @default(0)
  refundedAt                      DateTime?
  createdAt                       DateTime       @default(now())
  updatedAt                       DateTime       @updatedAt
  items                          OrderItem[]
  purchases                      Purchase[]

  @@index([status, expiresAt])
}

model OrderItem {
  id                String       @id @default(cuid())
  orderId           String
  order             Order        @relation(fields: [orderId], references: [id])
  questionBankId    String
  questionBank      QuestionBank @relation(fields: [questionBankId], references: [id], onDelete: Restrict)
  basePriceSnapshot Int
  amount            Int          // this line's prorated share of order total
  createdAt         DateTime     @default(now())

  @@index([orderId])
}
```

On `Purchase`: add `orderId String?` + relation. For cart-originated `Purchase` rows, use a synthetic id (e.g. `${orderId}:${questionBankId}`) for `providerOrderId` so the existing `@unique` constraint holds while `Order.providerOrderId` is what the payment provider actually sees.

## B. Server-side pricing (never trust client input)

New `src/lib/pricing/cart-pricing.ts` (peer to existing `src/lib/pricing.ts` — leave that file untouched, single-item flow keeps using it as-is):

```ts
function computeCartPricing(
  items: { basePrice: number; productType: ProductType }[],
  promotionsByType: Map<ProductType, { multiItemDiscountEnabled: boolean; multiItemDiscountPercent: number; minQualifyingItems: number }>,
  coupon?: Coupon,
): { subtotal: number; couponDiscountAmount: number; bundleDiscountAmount: number; bundleDiscountPercentApplied: number; total: number; perItemAmounts: number[] }
```

Rules:
- If a coupon is present, bundle discount is **not** applied (mutual exclusivity, per decision above).
- Group `items` by `productType`. Determine the applicable percentage:
  - **One distinct type present**, with count `>= minQualifyingItems` for that type and its toggle enabled → use that type's percentage.
  - **2+ distinct types present** → for each type present, take its configured percentage (0 if disabled or no row); applicable percentage = **minimum** across those types. This can be 0 (no discount) if any present type is disabled.
  - Fewer than 2 total items, or the single-type count is below `minQualifyingItems` → 0% (no discount).
- Per-item `amount` is prorated by each item's share of the final total, with a remainder-cent adjustment on the last item so `sum(OrderItem.amount) === Order.amount` exactly.
- `Order.bundleDiscountPercentSnapshot` stores whichever percentage was actually applied (for audit/receipt purposes), not a specific type's rate.

New endpoints/files:
- `src/app/api/v1/cart/create-order/route.ts` — mirrors `purchase/create-order/route.ts`'s guards (student auth, phone requirement, per-item `alreadyOwned` check, PENDING-expiry reap), loads all `PromotionSetting` rows keyed by `productType` (defaulting missing types to disabled/0%), computes each item's effective price via existing `resolveEffectivePrice`, calls `computeCartPricing` (passing each item's `productType`) for the authoritative total, creates `Order` + `OrderItem[]` + one `Purchase` per item in a single `prisma.$transaction`, then calls the existing `PaymentProvider.createOrder` using `Order.id`.
- `src/app/api/v1/cart/preview/route.ts` — read-only, re-derives current DB prices + `computeCartPricing` for the live cart-page discount preview (never trust localStorage prices for display of the "you saved ₹X" line).
- `src/lib/payment/finalize-order.ts` — structural mirror of `finalize-purchase.ts`'s `finalizePurchase`: same amount-mismatch check against `Order.amount`, then on success flips all child `Purchase` rows to `SUCCESS` in one transaction, calls existing `ensureInvoice` per `Purchase` (one invoice per item is fine for v1), and loops the existing mentorship confirmation email for any child `Purchase` whose `questionBank.type === "MENTORSHIP"`.
- `src/app/api/v1/payment/cashfree/webhook/route.ts`: add a first lookup by `providerOrderId` against `Order`; if found, call `finalizeOrder`; otherwise fall through to the existing `Purchase` lookup + `finalizePurchase` exactly as today (additive `if`, zero changes to the existing branch).

## C. Cart UI/state

- `src/stores/cart-store.ts` (new, Zustand + `persist`/localStorage): `items: { questionBankId, title, price, thumbnailPath, type }[]`, `addItem`, `removeItem`, `clear`.
- `purchase-card.tsx`: add an "Add to cart" action alongside the existing "Purchase now" button (which stays wired to the unchanged single-item flow).
- `src/app/cart/page.tsx` (new): line items + live discount preview via `/api/v1/cart/preview`, phone capture (same pattern as `purchase-card.tsx`), "Checkout" → `/api/v1/cart/create-order`.
- A new order-return page, e.g. `src/app/purchase/order/[orderId]/return/page.tsx`, listing all items in the order (the existing single-item return page is built for one `Purchase` — don't overload it).
- Cart-count badge: needs to go in the shared header/nav component (not yet located — flag as discovery item for whoever implements this phase).

## D. Admin UI

- `src/app/dashboard/admin/promotions/page.tsx` (new): **one row per product type** (Test Series, Question Bank, Mentorship — driven off the `ProductType` enum), each with its own `Switch` for enabled + `Input type=number` for percentage (0–100). `minQualifyingItems` per row defaults to 2 and stays hidden/advanced for v1.
- `src/app/api/v1/admin/promotion-setting/route.ts` (GET returns all rows, one per `ProductType`, defaulting missing ones to disabled/0%; PATCH upserts one row at a time keyed by `productType`) + `src/features/promotions/api.ts` mirroring the existing `features/coupons/api.ts` pattern.
- One line added to `navItems` in `dashboard/admin/layout.tsx`.
- A short note added to `dashboard/admin/coupons/page.tsx` clarifying that bundle/multi-item discounts live under the new "Multi-item Discount" page and are mutually exclusive with coupons.

## E. Phased rollout

**Phase 1 — data + server logic + admin only (no visible change to real users):**
1. Migration for `PromotionSetting` (seed one disabled/0% row per existing `ProductType` value), `Order`, `OrderItem`, nullable `Purchase.orderId`.
2. `cart-pricing.ts`, `finalize-order.ts`, `cart/create-order`, `cart/preview` routes.
3. Webhook route: additive `Order`-lookup branch.
4. Admin promotion-setting route + page + nav entry.
5. Verify via API/admin only — nothing user-facing references this yet, ships risk-free.

**Phase 2 — generic cart UI, ships to real users:**
6. `cart-store.ts`, `/cart` page, "Add to cart" button, cart badge, order-return page.
7. Any 2+ question banks/test series now bundle with the admin-configured %.

**Phase 3 — mentorship marketing wiring:**
8. Create two real `QuestionBank` rows (`type: MENTORSHIP`) for "Group 1"/"Group 2" via the existing admin mentors UI (no code change needed there).
9. Replace the static block at `(marketing)/page.tsx:653-686` with an interactive add-to-cart component, sourcing the "Both groups" total from `/api/v1/cart/preview` instead of hardcoded numbers. Set `PromotionSetting.multiItemDiscountPercent` to reproduce the intended saving (≈15% for ₹1,499 off ₹9,998).

## F. Risks/edge cases to keep in mind

- Mixed product types in one order (mentorship + question bank) work structurally fine; `finalizeOrder` must loop per mentorship-typed child `Purchase` for the confirmation email/WhatsApp link.
- Per-type percentages mean the applied rate isn't fixed at cart-add time — it can change between add-to-cart and checkout if an admin edits a type's percentage, or if the mix of items changes (e.g. removing the only other type drops a mixed cart back to a single-type cart with a different rate). The cart page's live `/api/v1/cart/preview` call must be the source of truth shown to the student; the final `create-order` computation is what's actually charged, always recomputed from current settings.
- If a product type is added later (new `ProductType` enum value) without a corresponding `PromotionSetting` row, it must default to disabled/0% rather than error or silently qualify at some default rate.
- Whole-order-only refunds for v1 (flip every child `Purchase` to `REFUNDED` together) — per-item refunds explicitly deferred.
- The existing single-item flow must remain provably untouched — treat this as a hard constraint in review, not an assumption.
- Bundle discount total is always recomputed server-side from live DB prices + live `PromotionSetting` at `create-order` time — never trust cart-store/localStorage numbers for the actual charge.
- Cart route must replicate the existing per-item `alreadyOwned` check, rejecting the whole order with a clear message if any single item is already owned.

## Verification
- Phase 1: exercise `cart/create-order` + `cart/preview` via curl/Postman with 1 item (no discount) and 2+ items (discount applied), confirm `Order`/`OrderItem`/`Purchase` rows are created correctly and the admin promotion page updates the applied percentage.
- Phase 2: manual browser test — add 2+ items to cart, verify live discount preview, complete mock checkout, confirm all child purchases flip to SUCCESS and appear in the student dashboard/invoices.
- Phase 3: verify the marketing mentorship section reflects real prices and the bundle discount matches the previous static "Save ₹1,499" framing.
- Confirm existing single-item purchase flow (`purchase-card.tsx` → `create-order` → `finalize-purchase`) is unaffected throughout — run it as a regression check after each phase.
