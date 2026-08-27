# High-Level Design (HLD)

## LMS Question Bank Purchase Platform

**Status:** Living document — updated as each module lands. See `docs/BRD.md` for requirements and `docs/RTM.md` for the traceability matrix.

---

## 1. Architecture Overview

A single Next.js (App Router, TypeScript) application handles both frontend and backend — no separate API server. PostgreSQL (via Prisma ORM) is the system of record. Uploaded files, previews and invoices live on Cloudinary as `type: authenticated` raw resources, served only by streaming through authenticated route handlers; thumbnails are public CDN images. Deployment target is a client-owned AWS/VPS instance running the app under PM2 behind Nginx.

```
┌─────────────┐      ┌───────────────────────────────────────┐      ┌────────────┐
│   Browser   │◄────►│  Next.js app (App Router)              │◄────►│ PostgreSQL │
│ (student /  │      │  - Server Components / Server Actions  │      │  (Prisma)  │
│  admin UI)  │      │  - /api/v1/** route handlers           │      └────────────┘
└─────────────┘      │  - middleware.ts (role guards)         │
                      └───────────────┬─────────────────────┬─┘
                                       │                     │
                              ┌────────▼────────┐   ┌────────▼────────┐
                              │ Cloudinary       │   │ Email (Resend)   │
                              │ (PDFs, previews, │   │ password reset,  │
                              │ invoices, thumbs)│   │ notifications     │
                              └──────────────────┘   └──────────────────┘
```

## 2. Module Breakdown (`src/features/<domain>/`)

Each domain owns its own components, hooks, and zod schemas; `src/app/**` route files stay thin wiring layers. This is the seam Phase 2 modules (`features/quizzes`, `features/courses`) will extend later without touching this code.

- **`features/auth`** — login, registration, forgot/reset password.
- **`features/question-banks`** — catalog browse, detail/preview, admin upload/edit/delete, early-bird pricing.
- **`features/coupons`** — admin CRUD, checkout-time validation.
- **`features/purchases`** — checkout, payment-provider hand-off, purchase history, downloads, invoices.

## 3. Data Flow

**Upload → preview generation**
1. Admin submits multipart form (`POST /api/v1/question-banks`) with metadata + PDF.
2. `lib/storage.ts` uploads it to Cloudinary as `question-bank/{id}/original` (raw, `type: authenticated`).
3. `lib/preview.ts` (pdf-lib) extracts page count; if preview is enabled, truncates to N pages and uploads `question-bank/{id}/preview` (raw, authenticated).

**Browse → checkout → download**
1. Student browses `/question-banks`, server-rendered from published `QuestionBank` rows.
2. `lib/pricing.ts` resolves the effective price (regular vs. active early-bird).
3. Optional coupon code validated via `POST /api/v1/purchase/validate-coupon` (preview only — not trusted).
4. `POST /api/v1/purchase/create-order` re-resolves price + re-validates coupon server-side, creates a `PENDING` `Purchase`, and hands off to the active `PaymentProvider`.
5. Provider confirms payment → `lib/payment/finalize-purchase.ts` transitions `Purchase` to `SUCCESS` (idempotently), increments coupon `usedCount` if applicable, and generates the invoice (`lib/invoice.ts`).
6. Student downloads via `GET /api/v1/files/download/[purchaseId]` — ownership-checked, then watermarked in memory (`lib/watermark.ts`) before streaming.

## 4. Payment Provider Abstraction

This phase does **not** implement a real payment gateway. `lib/payment/provider.ts` defines a `PaymentProvider` interface (`createOrder`, `handleCallback`); `lib/payment/mock-provider.ts` is the only implementation for now — it completes a purchase instantly, exercising the exact same `finalize-purchase.ts` path a real gateway will use. `lib/payment/index.ts` selects the provider via the `PAYMENT_PROVIDER` env var.

**Follow-up plan (separate, not this phase):** `lib/payment/cashfree-provider.ts` implementing the same interface — real Orders API calls, webhook signature verification, hosted checkout redirect, `CASHFREE_*` env vars. Nothing outside `lib/payment/` should need to change when that lands.

## 5. State Management & Routing

- **Server state** (admin tables, purchase-status, dashboard data): TanStack Query in client components.
- **Client UI state** (checkout steps, multi-step admin forms): Zustand stores in `src/stores/`.
- **Auth/session state**: `next-auth` `useSession` — no duplicate store.
- **Routing**: App Router route groups `(marketing)` (URL `/`) and `(auth)` (URLs `/login`, `/register`, etc., no `/auth` prefix) purely for organization. `dashboard/admin` and `dashboard/student` are a real URL segment (not a route group) so role-scoped pages live at `/dashboard/admin/**` and `/dashboard/student/**` — this is also what `src/proxy.ts`'s matcher targets. API routes versioned under `/api/v1/`.
- **Note (Next.js 16):** role guards live in `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`, Node runtime only). `params`/`searchParams` are `Promise`s everywhere — always `await` them. See root `CLAUDE.md` § "Next.js 16 specifics."

## 6. UI / Design System

Visual direction: professional CA exam-prep coaching + LMS look (trust-first, card-heavy — CA coaching platform conventions), combined with modern course-marketplace/dashboard patterns. Built on shadcn/ui (Tailwind v4, `base-nova` preset with tokens overridden to an indigo `#4338ca` primary + custom `success`/`warning` semantic tokens — see `src/app/globals.css`), Inter typeface, slate neutrals, semantic status colors always paired with a `Badge`. Full component inventory and page patterns are defined in the approved implementation plan and mirrored in the `mockup/` static HTML sign-off artifact, which the real Next.js UI should match 1:1 for component styling.

**Mentor/founder branding**: the platform is mentored by **CA Shakti Tiwari** — a practicing Chartered Accountant — and this is the platform's primary trust signal, following the founder-led branding pattern used by platforms like Physics Wallah (prominent photo + credentials + bio near the top of the landing page). See `mockup/index.html#mentor` for the reference section. **A real photo and finalized bio/stats are required from the client before launch** — this is static marketing content, not a database-driven field, so it's hand-authored directly in the landing page component rather than modeled in Prisma.

## 7. Deployment Topology

- Ubuntu VPS/EC2: Node LTS, PostgreSQL (on-box or RDS), Nginx reverse proxy, SSL via certbot.
- Process management: PM2 (`ecosystem.config.js`), `pm2 startup && pm2 save` for reboot persistence.
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — file storage is Cloudinary, so there is no server disk to provision or keep outside the app directory.
- `GET /api/v1/health` — unauthenticated DB-ping health check for an external uptime monitor.
- Nightly `pg_dump` cron (Cloudinary retains uploaded assets).

## 8. Extension Points for Phase 2 (not built now)

- `features/quizzes`, `features/courses` — new feature folders, same route-group/API-versioning conventions.
- `Purchase`/`Invoice` models already separate the "what was bought" concept from "how it's delivered," so bundled course+question-bank purchases can extend rather than replace them.
- `Coupon` model is already its own table (not inline on `Purchase`), so per-bank scoping or per-user limits can be added as new columns/join tables without a redesign.
- The `PaymentProvider` interface accepts subscriptions/refunds as new methods without touching the checkout UI.
- Admin dashboard shell's sidebar nav list is the single place new Phase 2 nav items (Quizzes, Courses, Analytics) get added.
