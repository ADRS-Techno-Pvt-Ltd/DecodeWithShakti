# LMS Question Bank Purchase Platform — Phase 1 Implementation Plan

## Context

ADRS Techno Pvt. Ltd. has quoted Shakti Tiwari for Phase 1 of an LMS: a question-bank marketplace where a single admin uploads downloadable question banks (PDFs), and students browse, preview, purchase, and download them. The project directory (`d:\adrsproject\decodewithshakti`) is currently **empty** — this is a greenfield build, not a modification of existing code.

The quotation (`ADRS_Techno_Quotation_LMS_Phase1_Verbatim.pdf`) also lists an extensive Phase 2 roadmap (quizzes, courses, subscriptions, multi-admin, analytics, AI features, live classes). This plan covers Phase 1 **plus a few user-requested additions**, but critically, the user has confirmed the intent is not to stop at Phase 1 — this codebase is meant to grow into a **full-fledged LMS**. That changes two things about how this plan is written:

1. **Architecture must be built for growth from day one** — proper state management, a routing/folder structure that scales past a handful of pages, and a payment layer that's pluggable rather than hard-wired to one gateway.
2. **Documentation starts now, not later** — a `docs/` folder (HLD, BRD, RTM) and a root `CLAUDE.md` are created in the very first build step, before any feature code, so every later phase (including the eventual Phase 2 work) has a durable record of what was decided and why.

**Cashfree is explicitly deferred.** The user does not want any real payment-gateway work done in this plan — Cashfree integration will be its own separate, later plan. This plan instead builds a **pluggable payment-provider abstraction** with a mock/manual provider standing in for Cashfree, so the purchase → invoice → download → watermark chain can be fully built and tested now, and the real gateway can be dropped in later behind the same interface without touching the rest of the app.

Stack decisions confirmed by the user:
- **Next.js (App Router, TypeScript) full-stack** — no separate backend server; API routes/server actions handle backend logic.
- **PostgreSQL** via **Prisma** ORM.
- **Cloudinary storage** for uploaded files (not local disk / S3) — PDFs are `type: authenticated` raw resources, served only by streaming through authenticated route handlers; thumbnails are public CDN images.
- Deployment target: client-owned AWS/VPS (must work with a standard Node process manager, not serverless-only).

## Scope

1. Landing page — Hero, Features, Pricing, Testimonials, FAQ; responsive; basic/standard animations only.
2. Auth — email/password login for Admin + Student; forgot/reset password; student dashboard (purchase history + downloads); admin dashboard (upload/manage/sales); **single admin account only**, no multi-admin.
3. Question bank management — PDF upload, single-level category, admin-configurable preview (toggle + N pages).
4. **Early bird pricing** — admin sets a discounted price + an end date/time per question bank; reverts to regular price automatically after the deadline.
5. **Coupon codes** — admin-created codes with an **expiry date** and a **total usage limit** (global, no per-user limit, no per-bank scoping).
6. **PDF watermark** — every downloaded (purchased) file is stamped with the logged-in student's email, diagonally, on every page, generated at download time.
7. Purchase & invoicing — pluggable payment-provider layer, **mock provider only in this plan** (real Cashfree integration is a separate future plan), auto-generated PDF invoice per successful purchase.
8. Deployment — client-owned AWS/VPS, basic health-check/monitoring.
9. **Documentation-first**: `docs/HLD.md`, `docs/BRD.md`, `docs/RTM.md`, and root `CLAUDE.md`, created in the first build step and kept current as the app grows.

**Explicitly out of scope for this plan:**
- Real Cashfree API integration (order creation against the live/sandbox API, webhook signature verification, checkout redirect) — the plan builds the seam for it (`lib/payment/provider.ts`) but implements only a mock provider. Swapping in real Cashfree is a **separate follow-up plan**.
- Everything in the quotation's Phase 2 roadmap (quizzes, courses, subscriptions, multi-admin, analytics, AI features, live classes).

## Scalability: State Management & Routing

Because this is meant to grow into a full LMS (quizzes, courses, progress tracking, etc. down the line), the architecture is chosen to scale rather than to be the smallest thing that works today:

**State management** — Next.js Server Components/Server Actions handle most data fetching already, so client-side state libraries are reserved for genuinely client-side concerns, not used as a default:
- **TanStack Query (`@tanstack/react-query`)** for server-state caching/mutations in client components — admin tables (question banks, coupons, sales), purchase-status polling, anywhere data needs client-side refetch/cache/optimistic-update behavior. This is the piece that will matter most as the LMS grows (quiz attempts, course progress, live dashboards).
- **Zustand** for lightweight global client UI state — checkout step state, multi-step admin forms, coupon-code input state. Chosen over Redux/Context-heavy patterns for minimal boilerplate and because it scales cleanly into future feature areas (quiz-taking state, course-player state) without a rewrite.
- Auth/session state stays on `next-auth`'s `useSession` — no duplicate auth state store.

**Routing & folder structure** — organized by route group and by feature, not as one flat pile, so Phase 2 modules can be added as new folders rather than requiring a restructure:
- App Router **route groups**: `(marketing)` for the landing page, `(auth)` for login/register/forgot/reset, `(dashboard)/admin` and `(dashboard)/student` for role-specific areas. Route groups don't affect the URL, just the organization.
- **API versioning from day one**: all API routes live under `src/app/api/v1/...`. Costs nothing now, avoids a breaking migration when the API needs to evolve later (e.g. once a Phase 2 mobile client or quiz engine needs its own endpoints).
- **Feature-folder structure** in `src/features/<domain>/` (e.g. `features/question-banks`, `features/coupons`, `features/purchases`, `features/auth`) — each holds its own components, hooks, zod schemas, and query/mutation hooks. `src/app/**` route files stay thin, just wiring a feature's components/actions into a URL. This is the structural seam that lets Phase 2 (`features/quizzes`, `features/courses`) get added later without touching Phase 1 code.

## UI / Design System

Visual bar: **professional exam-prep coaching + LMS look** — the kind of trust-first, card-heavy, information-dense design used by Indian CA/CS/CMA and competitive-exam coaching platforms, combined with modern course-marketplace/dashboard patterns (Coursera/Udemy-style catalog and student dashboards). Not a generic startup-SaaS landing page — this audience (exam aspirants and their parents) responds to credibility signals (structured pricing, clear categorization, testimonials, professional typography) more than flashy motion.

**Foundation — shadcn/ui used properly, not just installed:**
- `new-york` style, Tailwind CSS variables for theming (`--primary`, `--muted`, `--border`, etc.) defined once in `globals.css`/`tailwind.config` — never hardcoded hex values in components, so the whole app re-themes from one place.
- Typeface: **Inter** (shadcn default) — clean, professional, exam-content-friendly (good numeral legibility for prices/dates).
- Palette: deep indigo/blue primary (trust, education, finance-adjacent — matches CA/coaching-site conventions), neutral slate grays for text/surfaces, and semantic colors reserved strictly for status: green (published/success/active), amber (pending/early-bird/expiring-soon), red (failed/expired), gray (draft/unpublished). Status colors always paired with a shadcn `Badge`, never color-alone (accessibility).
- Spacing/radius: shadcn defaults (`rounded-lg` cards, consistent `gap-4`/`gap-6` rhythm) kept consistent across marketing pages and dashboards — one visual language, not two.

**Component inventory to install via the shadcn CLI** (installed as used, not all up front): `button`, `card`, `badge`, `table`, `data-table` pattern (table + `@tanstack/react-table`), `form` (wraps `react-hook-form` + zod resolver), `input`, `textarea`, `select`, `checkbox`, `switch` (preview toggle), `tabs`, `accordion` (FAQ), `dialog`, `sheet` (slide-over for admin create/edit forms instead of full page nav), `dropdown-menu`, `avatar`, `navigation-menu` / `sidebar` (dashboard shell), `breadcrumb`, `pagination`, `skeleton` (loading states), `alert`, `sonner` (toast notifications), `calendar` + `popover` (date pickers for early-bird end date / coupon expiry), `separator`, `progress` (upload progress).

**Page-pattern reference:**
- **Landing** (`(marketing)/page.tsx`): Hero with a clear value prop + primary CTA; a trust bar (exam categories as badges/logos — CA, CS, CMA, Banking, SSC, Railways, UPSC, State PSC); Features as an icon+text grid (`lucide-react` icons); Pricing as `Card`s with a "Most Popular" `Badge`; Testimonials as a card grid; FAQ as an `Accordion`. Standard fade/slide-in-on-scroll only (Tailwind transitions or `tailwindcss-animate`), no custom motion design.
- **Catalog** (`/question-banks`): grid of `Card`s (title, category `Badge`, price — with early-bird price struck-through regular price when active), category filter as a `Select`/`Tabs`, empty state via `Alert` when a filter yields nothing.
- **Detail + checkout** (`/question-banks/[slug]`): metadata + embedded PDF preview, price breakdown card (base → coupon discount → final, computed server-side and just *displayed* client-side), coupon-code `Input` + inline validation feedback, primary CTA button.
- **Dashboards** (`(dashboard)/admin`, `(dashboard)/student`): persistent left `sidebar` nav + topbar with `Avatar`/`DropdownMenu` (profile/logout) — same shell component reused by both roles with a role-specific nav-item list, so it's the one place that grows when Phase 2 adds nav items (Quizzes, Courses, Analytics). Lists (question banks, coupons, sales, purchase history) use the `data-table` pattern with `Badge` status columns and `pagination`. Create/edit flows use `sheet` + `form` rather than full-page navigation, matching the "professional dashboard" feel over "old-school CRUD forms."
- **Loading/empty/error**: `skeleton` for in-flight TanStack Query states, `alert` for empty results, `sonner` toasts for mutation success/failure — applied consistently, not ad hoc per page.

**Design sign-off before real build:** a static HTML mockup of the 6 key screens (landing, catalog, question-bank detail/checkout, student dashboard, admin dashboard, admin question-bank form) lives at `mockup/` in the project root, built first and used purely as a visual reference/sign-off artifact — the shadcn/ui component styling in the real Next.js app should carry over 1:1 from it (buttons, badges, cards, tables, inputs), so design decisions are settled once, up front, rather than relitigated per feature.

## Documentation (`docs/` + root `CLAUDE.md`) — created in the first build step

- **`docs/BRD.md`** (Business Requirements Document) — derived from the signed quotation: stakeholders (client: Shakti Tiwari; vendor: ADRS Techno), business objective, functional requirements per module (landing, auth, question banks, early bird, coupons, watermark, purchase/invoice, deployment), non-functional requirements (responsiveness, basic monitoring, security expectations), explicit out-of-scope list (Phase 2 roadmap + deferred Cashfree), success criteria.
- **`docs/HLD.md`** (High-Level Design) — architecture overview: Next.js full-stack topology, module breakdown (the `src/features/*` list above), data flow diagrams in text (upload → preview generation; browse → checkout → mock-payment → invoice → download+watermark), the payment-provider abstraction and where Cashfree plugs in later, deployment topology (VPS/Nginx/PM2/Postgres/local storage), and a short "extension points for Phase 2" section (where quizzes/courses/subscriptions would hook in, without building them).
- **`docs/RTM.md`** (Requirements Traceability Matrix) — a table mapping each BRD requirement → HLD component → implementing file(s)/module → verification step, so every requirement in the quotation (and the 3 user-requested additions) is traceable end-to-end. Updated whenever a requirement is added or a module is implemented.
- **`CLAUDE.md`** (project root — this location, not `docs/`, is what Claude Code auto-loads as project context) — folder structure explanation, dev commands (`dev`/`build`/`migrate`/`seed`), environment variable reference, the state-management/routing conventions above, the payment-provider abstraction note ("Cashfree is a mock today — see docs/HLD.md § Payment Provider before touching `lib/payment/`"), and pointers to `docs/BRD.md` / `docs/HLD.md` / `docs/RTM.md` for anyone (human or Claude) picking up later phases.

These four files are written **before any feature code**, then kept up to date as each module lands (the RTM in particular should be updated at the end of each build-order step below, not left stale).

## Project Structure

```
decodewithshakti/
├── docs/
│   ├── BRD.md
│   ├── HLD.md
│   └── RTM.md
├── mockup/                          # static HTML design sign-off, built first (see UI / Design System)
├── CLAUDE.md
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # creates the single admin account
│                                   # Binary assets live on Cloudinary (not local disk):
│                                   #   question-bank/{id}/original   (raw, authenticated)
│                                   #   question-bank/{id}/preview    (raw, authenticated)
│                                   #   question-bank/{id}/thumbnail  (image, public)
│                                   #   invoices/{invoiceNumber}      (raw, authenticated)
├── src/
│   ├── app/
│   │   ├── (marketing)/page.tsx                      # landing page
│   │   ├── (auth)/login, register, forgot-password, reset-password/[token]
│   │   ├── question-banks/page.tsx                   # public browse + category filter
│   │   ├── question-banks/[slug]/page.tsx            # detail + preview + buy
│   │   ├── purchase/[orderId]/return/page.tsx         # payment-provider return URL
│   │   ├── (dashboard)/student/{layout,page}.tsx
│   │   ├── (dashboard)/admin/{layout,page}.tsx, question-banks/{page,new,[id]/edit}, coupons/page.tsx, sales/page.tsx
│   │   └── api/v1/
│   │       ├── auth/[...nextauth], auth/register, forgot-password, reset-password
│   │       ├── question-banks/route.ts, question-banks/[id]/route.ts
│   │       ├── files/preview/[id]/route.ts             # public, capped preview only
│   │       ├── files/download/[purchaseId]/route.ts    # auth + ownership checked
│   │       ├── files/invoice/[invoiceId]/route.ts       # auth + ownership checked
│   │       ├── purchase/create-order, purchase/validate-coupon, purchase/webhook, purchase/verify/[orderId]
│   │       ├── coupons/route.ts, coupons/[id]/route.ts   # admin only
│   │       └── health/route.ts
│   ├── features/
│   │   ├── question-banks/ (components, hooks, schemas)
│   │   ├── coupons/
│   │   ├── purchases/
│   │   └── auth/
│   ├── components/{ui,landing}/           # cross-feature/shared only
│   ├── lib/
│   │   ├── prisma.ts, auth.ts, auth-guards.ts
│   │   ├── storage.ts (cloudinary), preview.ts (pdf-lib), invoice.ts (pdfkit), email.ts (resend)
│   │   ├── watermark.ts (pdf-lib), pricing.ts (early-bird + coupon resolution)
│   │   ├── payment/
│   │   │   ├── provider.ts          # PaymentProvider interface
│   │   │   ├── mock-provider.ts     # this plan's implementation
│   │   │   └── index.ts             # provider selected via PAYMENT_PROVIDER env var
│   │   └── validation/*.ts (zod)
│   ├── stores/                       # Zustand stores (checkout-step state, admin form wizards)
│   └── middleware.ts                 # role-guards /dashboard/**
├── ecosystem.config.js               # PM2
└── .env.example
```

## Key Dependencies

- Core: `next`, `react`, `tailwindcss`, `typescript`
- DB: `prisma`, `@prisma/client`
- Auth: `next-auth@beta` (Auth.js v5, Credentials provider, JWT sessions — no DB session tables needed), `bcryptjs` (pure JS, no native build step)
- **State**: `@tanstack/react-query`, `zustand`
- Validation/forms: `zod`, `react-hook-form`, `@hookform/resolvers`
- PDF: `pdf-lib` (preview truncation + watermarking + page count), `pdfkit` (invoice generation) — both pure JS, no native deps, easy on a VPS
- Email: `resend` (HTTP API SDK; `RESEND_API_KEY` + verified `EMAIL_FROM` domain)
- Storage: `cloudinary` (Node SDK; `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`)
- UI: `shadcn/ui` (`new-york` style) + `lucide-react` + `@tanstack/react-table` (for admin data tables) + `react-day-picker` (date pickers) — Tailwind-based, sufficient for "basic animations" (no GSAP/Framer Motion, per "no custom motion design"). See **UI / Design System** section below for the full visual direction and component inventory.
- **No payment SDK yet** — `@cashfreepayments/cashfree-js` and Cashfree server SDK are added only when the follow-up Cashfree plan runs.

## Database Schema (Prisma)

- `User` — id, name, email (unique), passwordHash, role (`ADMIN`/`STUDENT`), timestamps.
- `Category` — id, name, slug (own table, not free text, to avoid duplicate/typo categories in the filter dropdown; still single-level).
- `QuestionBank` — id, title, slug, description, categoryId, price (int, paise), earlyBirdPrice (int, nullable), earlyBirdEndsAt (DateTime, nullable), fileName, filePath, fileSizeBytes, totalPages, previewEnabled, previewPageCount, previewFilePath, isPublished.
- `Coupon` — id, code (unique, uppercased on save), discountType (`PERCENT`/`FLAT`), discountValue (int — percent 1-100, or paise for FLAT), expiresAt (DateTime), usageLimit (int), usedCount (int, default 0), isActive (Boolean, default true). Global — not scoped to a bank/category, no per-user limit, per the user's requested scope.
- `Purchase` — id, userId, questionBankId (`onDelete: Restrict` — admin can't hard-delete a bank once purchased, must unpublish instead), basePriceSnapshot (int), couponId (nullable FK), couponCodeSnapshot (string, nullable), discountAmount (int, default 0), amount (int — final charged amount), status (`PENDING`/`SUCCESS`/`FAILED`), **paymentProvider (string, e.g. `"mock"` — recorded so real-provider purchases are distinguishable once Cashfree lands), providerOrderId (unique), providerPaymentId, paymentMethod**.
- `Invoice` — id, purchaseId (unique), invoiceSeq (autoincrement), invoiceNumber (e.g. `INV-2026-000123`), filePath, amount, issuedAt.
- `PasswordResetToken` — id, userId, tokenHash (SHA-256 of the raw token — never store the raw token), expiresAt, usedAt.

No `Session`/`Account` tables needed — Auth.js runs JWT-only with the Credentials provider.

**Effective price resolution** (`lib/pricing.ts`): `effectivePrice = (questionBank.earlyBirdEndsAt && now < earlyBirdEndsAt && earlyBirdPrice != null) ? earlyBirdPrice : price`. Coupon discount is applied on top of `effectivePrice`, server-side only — the client never dictates the final amount.

## Auth

**Auth.js v5, Credentials provider, JWT sessions.**
- `lib/auth.ts`: validates email/password against `User.passwordHash` via `bcryptjs.compare`; `jwt`/`session` callbacks embed `id` + `role`.
- `src/middleware.ts`: redirects unauthenticated users off `/dashboard/**`; enforces `role === ADMIN` for `/dashboard/admin/**` and `role === STUDENT` for `/dashboard/student/**`.
- Student self-registration via `/api/v1/auth/register` (zod-validated, bcrypt-hashed, `role: STUDENT`).
- **Admin account is seeded once** via `prisma/seed.ts` reading `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars — no admin-signup UI, matching "single admin account only."
- Forgot/reset: `POST /api/v1/auth/forgot-password` generates a random token, stores its SHA-256 hash + 1hr expiry, emails the raw token as a reset link (always returns a generic success response to avoid email enumeration). `POST /api/v1/auth/reset-password` validates the hash + expiry + unused state, updates the password, marks the token used.

## Admin Flows

- **Upload** (`POST /api/v1/question-banks`, multipart): zod-validates metadata, restricts file type to PDF and a max size (`MAX_UPLOAD_MB` env), uploads to Cloudinary as `question-bank/{id}/original` (raw, authenticated), extracts `totalPages` via pdf-lib, and if preview is enabled, uploads `question-bank/{id}/preview` capped at `min(previewPageCount, totalPages)`.
- **Manage/edit/delete**: list (including unpublished) with edit/delete actions; editing preview settings regenerates the preview from the stored original; delete is blocked (via the FK `Restrict` + an explicit pre-check for a clean error) once a `Purchase` references the bank — admin unpublishes instead. Upload/edit form includes early-bird price + end-date fields (optional).
- **Coupons** (`/dashboard/admin/coupons`): CRUD list — code (or auto-generate), discount type + value, expiry date, usage limit; table shows `usedCount / usageLimit` and expiry status; deactivate (`isActive = false`) instead of delete once used.
- **Sales**: `/dashboard/admin/sales` — paginated, filterable table of `Purchase` rows joined to `User`/`QuestionBank`, showing base price, coupon applied, discount, final amount, and payment provider. Not an analytics dashboard (that's Phase 2).

## Student Flows

- **Browse**: `/question-banks?category=slug`, server-rendered, published banks only, category filter from the `Category` table. Listing/detail pages show the early-bird price (strikethrough on regular price) when active.
- **Preview**: `GET /api/v1/files/preview/[id]` serves only `previewFilePath` (never the original) and 404s if preview isn't enabled — the full file can never leak pre-purchase.
- **Coupon entry**: optional coupon-code field calls `POST /api/v1/purchase/validate-coupon` (checks `isActive`, `expiresAt > now`, `usedCount < usageLimit`) to preview the discount; the same validation re-runs server-side at order creation — the client-previewed discount is never trusted as-is.
- **Purchase** (mock provider — see below): `POST /api/v1/purchase/create-order` re-resolves the effective price and re-validates any coupon server-side, computes `amount`, creates a `PENDING` `Purchase` snapshotting price/coupon/discount, then hands off to the active `PaymentProvider`.
- **Download** (`GET /api/v1/files/download/[purchaseId]`): verifies `purchase.userId === session.user.id && purchase.status === 'SUCCESS'`, then runs `lib/watermark.ts` over the original file **in memory** — student's email diagonally on every page — and streams the watermarked bytes. The clean original on Cloudinary is never modified. Same ownership pattern for invoice download (unwatermarked — it already identifies the buyer).

## Preview Generation (pdf-lib, synchronous, no queue needed at this scale)

```ts
const srcDoc = await PDFDocument.load(await fs.promises.readFile(originalPath));
const totalPages = srcDoc.getPageCount();
const pageCount = Math.min(previewPageCount, totalPages);
const previewDoc = await PDFDocument.create();
const pages = await previewDoc.copyPages(srcDoc, Array.from({length: pageCount}, (_, i) => i));
pages.forEach(p => previewDoc.addPage(p));
await fs.promises.writeFile(previewPath, await previewDoc.save());
```
`totalPages` is persisted so the admin form can validate `previewPageCount ≤ totalPages`. Uploads are restricted to PDF (matches "downloadable file format" + makes preview generation well-defined).

## Watermarking (pdf-lib, generated per-download, not stored)

The original file on Cloudinary always stays clean. The download route stamps it on the fly:

```ts
const srcDoc = await PDFDocument.load(await readStoredFile(originalPublicId));
const font = await srcDoc.embedFont(StandardFonts.Helvetica);
for (const page of srcDoc.getPages()) {
  const { width, height } = page.getSize();
  page.drawText(userEmail, {
    x: width / 2 - 150, y: height / 2,
    size: 24, font, color: rgb(0.6, 0.6, 0.6), opacity: 0.3,
    rotate: degrees(45),
  });
}
const watermarked = await srcDoc.save();
```

Kept in memory for the request duration, streamed directly — no watermarked copy persisted anywhere. Runs only on the authenticated, ownership-checked download route, never on the public preview route.

## Payment Provider Abstraction (Cashfree deferred to a follow-up plan)

This is the key structural decision for this plan: purchases must work end-to-end **without** implementing a real gateway, in a way that doesn't need to be rebuilt when Cashfree is added later.

- `lib/payment/provider.ts` defines a `PaymentProvider` interface: `createOrder(purchase): Promise<{ redirectUrl | sessionToken, providerOrderId }>` and `handleCallback(payload): Promise<{ providerOrderId, status: 'SUCCESS' | 'FAILED', providerPaymentId? }>`.
- `lib/payment/mock-provider.ts` — this plan's only implementation. `createOrder()` immediately marks the `Purchase` as `SUCCESS` (simulating instant successful payment) and returns a redirect straight to `/purchase/[orderId]/return`, so the rest of the flow (invoice generation, coupon `usedCount` increment, download unlock) runs exactly as it will with a real gateway later. No external network call, no API keys needed.
- `lib/payment/index.ts` selects the active provider via a `PAYMENT_PROVIDER` env var (`"mock"` for this plan; `"cashfree"` reserved for the follow-up plan) — nothing else in the codebase should reference `mock-provider.ts` directly, so swapping providers later is a one-line env change plus a new `cashfree-provider.ts` implementing the same interface.
- `POST /api/v1/purchase/create-order` and the return-URL route (`/purchase/[orderId]/return`) are written against the `PaymentProvider` interface only, never against mock-specific logic.
- The idempotent status-transition logic (only ever incrementing `Coupon.usedCount` and generating the invoice on the *first* transition to `SUCCESS`) lives in a shared `lib/payment/finalize-purchase.ts` helper, called by whichever provider's callback handler runs — this is the exact logic the future Cashfree webhook will also call, so it's built and tested once, now.
- **What the follow-up Cashfree plan will add** (not built here): `lib/payment/cashfree-provider.ts`, the real Orders API call, webhook signature verification, `@cashfreepayments/cashfree-js` checkout redirect, and the `CASHFREE_*` env vars — all plugging into the interface and `finalize-purchase.ts` helper already in place.

## Invoice Generation

`pdfkit` (pure JS) builds a simple invoice — header, invoice number/date, bill-to, line item (bank title + base price), discount line (coupon code + amount, if applied), total, payment note (shows `paymentProvider`, e.g. "Paid — mock provider" for now) — triggered from `finalize-purchase.ts` right after `Purchase.status = SUCCESS`. Numbering uses `Invoice.invoiceSeq` formatted as `INV-{year}-{padded seq}`.

## Deployment (client-owned AWS/VPS)

- Ubuntu VPS/EC2: Node LTS, PostgreSQL (on-box or RDS), Nginx.
- **PM2** path: `npm ci && npx prisma migrate deploy && npm run build`, `pm2 start ecosystem.config.js`, `pm2 startup && pm2 save`. (Docker is a viable alternative — no storage volume needed now that files live on Cloudinary.)
- Nginx reverse-proxies to `127.0.0.1:3000`, `client_max_body_size` raised to match `MAX_UPLOAD_MB`, SSL via certbot.
- File storage is Cloudinary — no server disk to provision or back up. Confirm the Cloudinary plan's raw-file size cap covers `MAX_UPLOAD_MB`.
- `.env` on the server holds `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `PAYMENT_PROVIDER=mock`, `RESEND_API_KEY`, `EMAIL_FROM`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — no `CASHFREE_*` needed until the follow-up plan.
- **Health check**: unauthenticated `GET /api/v1/health` (DB ping + timestamp) — point an external uptime pinger at it.
- Nightly `pg_dump` cron (Cloudinary holds its own copies of uploaded assets).
- Rate-limit login/forgot-password routes with a lightweight in-memory limiter.

## Build Order

1. **Docs + design sign-off + foundations** — write `docs/BRD.md`, `docs/HLD.md`, `docs/RTM.md` (skeleton, filled in as each module lands), root `CLAUDE.md`; build the `mockup/` static HTML screens (landing, catalog, detail/checkout, student dashboard, admin dashboard, admin question-bank form) and get visual sign-off before real UI work starts; Next.js scaffold (route groups, `src/features/`, `src/stores/`), Tailwind/shadcn (`new-york` theme tokens), TanStack Query + Zustand setup, Prisma schema (incl. `Coupon`, early-bird fields, `paymentProvider`) + migration + admin seed, Auth.js (login/register/forgot/reset) with Resend, role-guard middleware.
2. **Admin core** — storage lib, upload API + form (incl. early-bird fields), pdf-lib preview truncation, edit/delete, admin dashboard shell, coupon CRUD.
3. **Landing page + student browse** — Hero/Features/Pricing/Testimonials/FAQ, public question-bank list + filter, detail page with embedded preview and early-bird price display.
4. **Purchase flow (mock provider)** — `lib/pricing.ts`, coupon validation endpoint, `lib/payment/provider.ts` + `mock-provider.ts` + `finalize-purchase.ts`, create-order route, return-URL page, ownership-checked + watermarked download route.
5. **Invoices + dashboard polish** — pdfkit invoice generation wired into `finalize-purchase.ts`, invoice download, student purchase-history UI, admin sales table, responsiveness/empty-state pass.
6. **Testing** — auth flows, preview never exposes the full file pre-purchase, early-bird price flips correctly at the deadline, coupon validation (expired/exhausted/valid), watermark renders correctly on a real download, full mock-provider purchase cycle (order → instant success → invoice → unlocked download), download-authorization edge cases (non-owner, unauthenticated, non-purchaser), mobile responsiveness.
7. **Deployment** — provision VPS, install Node/Postgres/Nginx, configure production env vars (`PAYMENT_PROVIDER=mock`), run migrations, start via PM2, Nginx + SSL, verify `/api/v1/health`, one production smoke-test purchase, uptime monitor + backup cron.
8. **(Follow-up, separate plan)** — real Cashfree integration: `cashfree-provider.ts`, Orders API, webhook signature verification, checkout redirect, `CASHFREE_*` env vars, production Cashfree credentials from the client.

This sequencing loosely tracks the quotation's ~1 week timeline for steps 1–7, with the Cashfree work explicitly split out as its own follow-up effort per the user's instruction.

## Critical Files to Create First

- `docs/BRD.md`, `docs/HLD.md`, `docs/RTM.md`, `CLAUDE.md` — written before feature code
- `prisma/schema.prisma` — the data model everything else depends on
- `src/lib/auth.ts` — Auth.js config
- `src/middleware.ts` — role guards
- `src/lib/payment/provider.ts` + `mock-provider.ts` + `finalize-purchase.ts` — the payment seam Cashfree will later plug into
- `src/lib/storage.ts` (Cloudinary) + `src/lib/preview.ts` — file handling + preview truncation
- `src/lib/pricing.ts` — early-bird + coupon effective-price resolution
- `src/lib/watermark.ts` — per-download email watermarking
- `src/app/api/v1/files/download/[purchaseId]/route.ts` — ownership-checked, watermarked download

## Verification

- **Auth**: register a student, log in as both roles, confirm `/dashboard/admin` blocks students and vice versa; run the forgot/reset-password flow end to end against a live Resend key.
- **Upload + preview**: upload a multi-page PDF with preview enabled at N pages; confirm the preview route returns exactly N pages and the download route is unreachable pre-purchase.
- **Purchase (mock)**: run a purchase through the mock provider, confirm it transitions straight to `SUCCESS`, an `Invoice` row + PDF are created, and the download route now succeeds for the purchaser only (test with a second, non-purchasing account to confirm 403).
- **Early bird**: set a bank's `earlyBirdEndsAt` in the past vs. future and confirm the displayed/charged price flips correctly at the boundary.
- **Coupons**: create a coupon with `usageLimit: 1`, confirm it applies on first use, then confirm a second attempt is rejected (limit exhausted) and an expired code is rejected.
- **Watermark**: download a purchased file and visually confirm the buyer's email appears diagonally on every page, and that the preview and admin's original file remain unwatermarked.
- **Docs**: confirm `docs/RTM.md` has a row for every requirement implemented so far, and `CLAUDE.md` accurately describes the current folder structure and env vars.
- **Deployment**: after deploying to the VPS, hit `/api/v1/health`, confirm DB connectivity; run one production smoke-test purchase (mock provider) to confirm the whole chain works outside localhost.
