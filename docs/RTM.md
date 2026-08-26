# Requirements Traceability Matrix (RTM)

## LMS Question Bank Purchase Platform

**Status:** Living document — update the "Implementing Module" and "Status" columns as each build-order step lands. See `docs/BRD.md` for requirement definitions and `docs/HLD.md` for architecture.

| Req ID | Requirement (BRD) | HLD Component | Implementing Module / File(s) | Verification Step | Status |
|---|---|---|---|---|---|
| FR-1 | Landing page sections (Hero/Features/Pricing/Testimonials/FAQ) | UI/Design System | `src/app/(marketing)/page.tsx` | Visual review against `mockup/`; responsive check | Implemented, renders correctly |
| FR-1a | "Meet Your Mentor" section (CA Shakti Tiwari photo + credentials + bio) | UI/Design System | `src/components/landing/mentor-section.tsx` | Visual review against `mockup/index.html#mentor`; confirm real photo swapped in before launch | Implemented with placeholder photo — **blocked on client providing a real photo + final bio/stats** |
| FR-2 | Responsive, basic animations only | UI/Design System | Tailwind/shadcn theme, global styles | Manual check on mobile + desktop breakpoints | Implemented (Tailwind responsive utilities) — not yet manually checked on real devices |
| FR-3 | Email/password login (Admin + Student) | Auth | `src/lib/auth.ts`, `src/app/api/v1/auth/[...nextauth]`, `src/app/(auth)/login` | Log in as both roles | **Verified end-to-end** (Playwright) |
| FR-4 | Forgot/reset password | Auth | `api/v1/auth/forgot-password`, `api/v1/auth/reset-password`, `(auth)/forgot-password`, `(auth)/reset-password/[token]` | End-to-end reset via dev SMTP | Implemented — not yet verified against a real SMTP account (needs `SMTP_*` env vars) |
| FR-5 | Student dashboard (purchase history + downloads) | Purchases | `dashboard/student/page.tsx`, `dashboard/student/layout.tsx` | Purchase then verify it appears + downloads | **Verified end-to-end** |
| FR-6 | Admin dashboard (upload/manage/sales) | Question Banks, Purchases | `dashboard/admin/**` | Upload a bank, verify it appears in sales after purchase | **Verified end-to-end** |
| FR-7 | Single admin account only | Auth | `prisma/seed.ts` (ADMIN_EMAIL/PASSWORD), no admin-signup UI | Confirm no public admin registration route exists | Implemented — admin seeded, confirmed no admin-signup route |
| FR-8 | Admin PDF upload | Question Banks | `api/v1/question-banks` POST, `lib/storage.ts`, `dashboard/admin/question-banks/question-bank-sheet.tsx` | Upload a PDF, confirm stored under `storage/questionbanks/{id}/` | **Verified end-to-end** |
| FR-9 | Single-level categorization (CA level/subject) | Question Banks | `Category` model, `api/v1/categories`, catalog filter | Filter catalog by category | Implemented — 6 CA categories seeded, filter UI works |
| FR-10 | Configurable preview (toggle + N pages) | Question Banks | `lib/preview.ts`, `api/v1/files/preview/[id]` | Confirm preview route returns exactly N pages | Implemented — not yet exercised in the verified E2E run (preview toggle wasn't enabled in that test); truncation logic unit-reviewed |
| FR-11 | Early bird pricing | Question Banks, Pricing | `lib/pricing.ts`, `QuestionBank.earlyBirdPrice/earlyBirdEndsAt` | Set deadline in past/future, confirm price flips | Implemented — not yet exercised end-to-end |
| FR-12 | Coupon codes (expiry + usage limit) | Coupons | `Coupon` model, `dashboard/admin/coupons/**` | Create coupon with `usageLimit: 1`, confirm CRUD | Implemented — CRUD UI built, not yet exercised end-to-end |
| FR-13 | Server-side coupon validation at checkout | Purchases | `api/v1/purchase/validate-coupon`, `create-order` | Attempt expired/exhausted/valid codes | Implemented — not yet exercised end-to-end |
| FR-14 | PDF watermark on download | Purchases | `lib/watermark.ts`, `api/v1/files/download/[purchaseId]` | Download purchased file, confirm email watermark on every page | **Verified** — extracted PDF text via `pypdf`, confirmed buyer email present on every page |
| FR-15 | One-time purchase only | Purchases | `Purchase` model (no subscription fields) | Schema review | Verified via schema review |
| FR-16 | Auto-generated invoice | Purchases | `lib/invoice.ts`, `Invoice` model, `finalize-purchase.ts` | Complete a purchase, confirm invoice PDF + row created | **Verified end-to-end** (invoice download returns a valid PDF) |
| FR-17 | Payment-provider abstraction (mock only this phase) | Payment Provider Abstraction | `lib/payment/provider.ts`, `mock-provider.ts`, `finalize-purchase.ts` | Complete a mock purchase end-to-end | **Verified end-to-end** |
| FR-18 | Deployment on client-owned AWS/VPS | Deployment Topology | `ecosystem.config.js`, Nginx config (not in repo) | Deploy to VPS, confirm app serves via Nginx | Not started — this is the only remaining build-order step |
| FR-19 | Basic system monitoring | Deployment Topology | `api/v1/health/route.ts` | Hit `/api/v1/health`, confirm DB ping | **Verified** (`{"status":"ok","db":"connected"}` against live Neon DB) |
| NFR-3 | Scalable architecture (state mgmt, versioned API, feature folders) | State Management & Routing | `src/features/**`, `src/stores/**`, `/api/v1/**` | Code review against `docs/HLD.md` § 5 | Implemented |
| NFR-4 | Downloads/invoices authorization-checked | Purchases | `api/v1/files/download`, `api/v1/files/invoice` | Attempt download as non-purchaser, confirm 403 | **Verified** — admin session correctly got 403 attempting a student's download |

**Explicitly untraced (out of scope, per BRD § 5):** Phase 2 roadmap items, real Cashfree integration (tracked separately once its follow-up plan exists).

## Bugs found and fixed during verification

Real, reproducible bugs caught by an actual Playwright end-to-end run (not just type-checking/linting) — kept here as a record since they'd otherwise recur:

1. **Auth.js client couldn't find its own session endpoint** — `next-auth/react`'s `SessionProvider`/`signIn`/`signOut` default to `/api/auth/*`, but our API is versioned at `/api/v1/auth/*`. Fixed by setting `basePath: "/api/v1/auth"` on both the server `NextAuth()` config (`src/lib/auth.ts`) and the client `<SessionProvider basePath="...">` (`src/app/providers.tsx`) — both must agree, they're separate bundles.
2. **Dashboard crashed with a 500** — Lucide icon *component references* were passed as props from a Server Component (`layout.tsx`) into the Client Component `DashboardShell`, which violates RSC serialization rules (functions can't cross that boundary). Fixed by changing `NavItem.icon` to `React.ReactNode` and passing already-rendered elements (`<LayoutDashboard />`) instead of the component itself.
3. **Question bank upload always saved `previewEnabled: true`, even when unchecked** — classic `z.coerce.boolean()` footgun: `Boolean("false")` is `true` in JavaScript, so the FormData string `"false"` coerced to `true`. Fixed with a custom `booleanField()` preprocessor in `lib/validation/question-bank.ts` that checks the string value explicitly.
4. **Stored file paths used Windows backslashes** (`storage\questionbanks\...`), which would break on a Linux VPS in production. Fixed `lib/storage.ts` to always join paths with `/` regardless of host OS.

Also confirmed: Base UI (this project's shadcn primitive library) uses a `render` prop for polymorphism, not Radix's `asChild` — and its `Button` needs `nativeButton={false}` when rendering as a non-button element via `render` (handled centrally in `components/ui/button.tsx` so call sites don't need to think about it).
