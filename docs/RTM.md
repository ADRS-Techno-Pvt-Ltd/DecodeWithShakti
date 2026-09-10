# Requirements Traceability Matrix (RTM)

## LMS Question Bank Purchase Platform

**Status:** Living document — update the "Implementing Module" and "Status" columns as each build-order step lands. See `docs/BRD.md` for requirement definitions and `docs/HLD.md` for architecture.

> **Note (storage migration):** `lib/storage.ts` moved from local disk to Cloudinary (question-bank PDFs/previews/thumbnails under `question-bank/<id>/`, invoices under `invoices/`). Rows previously "Verified end-to-end" that touch file I/O — FR-5, FR-8, FR-14, FR-16, NFR-4 — need one re-verification pass against a live Cloudinary account.

| Req ID | Requirement (BRD) | HLD Component | Implementing Module / File(s) | Verification Step | Status |
|---|---|---|---|---|---|
| FR-1 | Landing page sections (Hero/Features/Pricing/Testimonials/FAQ) | UI/Design System | `src/app/(marketing)/page.tsx` | Visual review against `mockup/`; responsive check | Implemented, renders correctly |
| FR-1a | "Meet Your Mentor" section (CA Shakti Tiwari photo + credentials + bio) | UI/Design System | `src/components/landing/mentor-section.tsx` | Visual review against `mockup/index.html#mentor`; confirm real photo swapped in before launch | Implemented with placeholder photo — **blocked on client providing a real photo + final bio/stats** |
| FR-1b | Admin-managed landing FAQ (add/edit/reorder/publish) | UI/Design System, Content | `FaqItem` model, `api/v1/faqs` (GET public + `?all=true` admin, POST), `api/v1/faqs/[id]` (PATCH/DELETE), `dashboard/admin/faqs/**`, `src/app/(marketing)/use-faqs.ts` | Add/edit/reorder/hide a FAQ in the admin panel, confirm the landing "Before you ask in chat" section reflects it; 5 initial FAQs seeded | Implemented — not yet exercised end-to-end |
| FR-2 | Responsive, basic animations only | UI/Design System | Tailwind/shadcn theme, global styles | Manual check on mobile + desktop breakpoints | Implemented (Tailwind responsive utilities) — not yet manually checked on real devices |
| FR-3 | Email/password login (Admin + Student) | Auth | `src/lib/auth.ts`, `src/app/api/v1/auth/[...nextauth]`, `src/app/(auth)/login` | Log in as both roles | **Verified end-to-end** (Playwright) |
| FR-4 | Forgot/reset password | Auth | `api/v1/auth/forgot-password`, `api/v1/auth/reset-password`, `(auth)/forgot-password`, `(auth)/reset-password/[token]` | End-to-end reset via Resend | Implemented — not yet verified against a live Resend account (needs `RESEND_API_KEY` + verified `EMAIL_FROM` domain) |
| FR-5 | Student dashboard (purchase history + downloads) | Purchases | `dashboard/student/page.tsx`, `dashboard/student/layout.tsx` | Purchase then verify it appears + downloads | **Verified end-to-end** |
| FR-6 | Admin dashboard (upload/manage/sales) | Question Banks, Purchases | `dashboard/admin/**` | Upload a bank, verify it appears in sales after purchase | **Verified end-to-end** |
| FR-7 | Single admin account only | Auth | `prisma/seed.ts` (ADMIN_EMAIL/PASSWORD), no admin-signup UI | Confirm no public admin registration route exists | Implemented — admin seeded, confirmed no admin-signup route |
| FR-8 | Admin PDF upload | Question Banks | `api/v1/question-banks` POST, `lib/storage.ts` (Cloudinary), `dashboard/admin/question-banks/question-bank-sheet.tsx` | Upload a PDF, confirm it lands in Cloudinary under `question-bank/<id>/original` (raw, authenticated) | Implemented — verified E2E against local-disk storage; not yet re-verified against Cloudinary |
| FR-8a | Admin "featured" flag + optional highlight bullets per bank | Question Banks | `QuestionBank.isFeatured/features`, `question-bank-sheet.tsx`, `api/v1/question-banks` (POST + PATCH, `?featured=true`), `src/app/(marketing)/use-featured-banks.ts`, `question-banks/[slug]/purchase-card.tsx` | Mark a bank featured with highlights, confirm it replaces the static cards in the landing "Priced per bank" section and the checklist shows on the detail page | Implemented — not yet exercised end-to-end |
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
| NFR-4 | Downloads/invoices authorization-checked | Purchases | `api/v1/files/download`, `api/v1/files/invoice` | Attempt download as non-purchaser, confirm 403 | **Verified** — non-owner (incl. admin) gets 403 on `download`; `invoice` is allowed for the buyer **or any admin** (admin sales table exposes the link), and 403s for other students |
| FR-20 | Terms & Conditions / Privacy Policy pages | UI/Design System | `src/app/(marketing)/terms`, `src/app/(marketing)/privacy`, `src/components/landing/legal-layout.tsx` | Visual review; footer links on landing page point to both routes | **Verified** — both routes return 200, footer links updated from placeholder `#` hrefs |
| FR-21 | Student self-service account deletion | Auth, Purchases | `api/v1/account/route.ts`, `dashboard/student/settings/**` | Delete an account with no purchases (hard delete) and one with purchases (anonymized, `Purchase`/`Invoice` rows retained); confirm unauthenticated `DELETE` is rejected | Implemented — password-gated deletion verified against unauth (401) and route-guard (redirect) cases; full hard-delete vs. anonymize branch not yet exercised against seeded purchase data |

## Test Series Answer Workflow Extension

| Requirement | Implementing Module / File(s) | Verification Step | Status |
|---|---|---|---|
| QuestionBank-centered Test Series | `QuestionBank.answerKeys`, `QuestionBank.answerSubmissions`, `dashboard/admin/question-banks/**` | Create a Test Series with the existing question PDF fields and optional linked Answer Key PDF | Implemented — Answer Key is created/replaced through the existing Test Series form |
| Student purchased Test Series area | `dashboard/student/answer-sheets/**`, `Purchase.questionBankId` | Student sees only successful purchases and opens each bank for answer submission | Implemented — build/type/lint validated; live workflow not yet exercised |
| Student answer-sheet upload | `AnswerSheetSubmission`, `api/v1/answer-sheets`, `dashboard/student/answer-sheets/**` | Upload only a PDF from a purchased Test Series; confirm bank-derived metadata and pending state | Implemented — server verifies matching successful purchase and exact QuestionBank ID |
| Submission-gated Answer Key (Test Series) | `api/v1/answer-keys`, `api/v1/files/answer-keys/[id]` | Purchased Test Series without submission remains locked; matching submission unlocks only its key | Implemented — list and file routes require exact purchase plus exact student submission for `TEST_SERIES` type |
| Question-bank Answer Key (purchase-gated) | `question-bank-sheet.tsx`, `api/v1/question-banks` (create), `api/v1/question-banks/[id]/answer-key`, `api/v1/answer-keys`, `api/v1/files/answer-keys/[id]`, `dashboard/student/purchases` | Admin attaches an optional answer/solutions PDF to a `QUESTION_BANK`; student downloads it immediately after a successful purchase (no submission required) | Implemented — answer-key form field and create/replace routes de-gated from TEST_SERIES-only; student list + file routes skip the submission check when `questionBank.type === "QUESTION_BANK"`; "Answer Key" download button added to My Purchases |
| Private original answer-sheet access | `api/v1/files/answer-sheets/[id]`, `lib/storage.ts` | Student and admin can view the original; another student receives 404 | Implemented — authorization is route-enforced; live Cloudinary access not yet exercised |
| Admin evaluation upload | `api/v1/answer-sheets/[id]`, `dashboard/admin/answer-sheets/**` | Admin sees Test Series context and uploads a separate evaluated PDF; status becomes `EVALUATED` | Implemented — existing evaluation interaction preserved |
| Private evaluated answer access | `api/v1/files/answer-sheets/[id]/evaluated` | Student cannot access before evaluation and can access only their own evaluated PDF afterward | Implemented — route gates null evaluated paths and ownership |
| Legacy Answer Key/submission preservation | Nullable `questionBankId`, migration `link_test_series_answer_workflow` | Existing category-only rows remain stored and are excluded from new student unlock logic | Implemented — migration applied without data reset |
| Submission/evaluation email notifications | `src/lib/email.ts`, answer-sheet route handlers | Confirm student/admin submission email and student evaluation email; email failure must not undo persistence | Implemented — best-effort Resend calls; live Resend delivery not yet exercised |
| Answer-sheet authorization and file validation | `auth-guards.ts`, answer-sheet routes, `features/answer-sheets/validation.ts` | Reject non-PDF, oversized, malformed, duplicate, cross-student, and non-admin requests | Implemented — server-side checks added; focused automated tests not yet present |

## Subject dimension

| Requirement | Implementing Module / File(s) | Verification Step | Status |
|---|---|---|---|
| Subject taxonomy (separate from Category) | `Subject` model + nullable `QuestionBank.subjectId`, migration `add_subject_and_qb_answer_key`, `prisma/seed.ts` | Seed runs idempotently; subjects listed at `GET /api/v1/subjects` | Implemented — 14 CA subjects seeded via upsert |
| Subject on admin question-bank / test-series form | `question-bank-sheet.tsx`, `features/question-banks/api.ts` (`fetchSubjects`), `dashboard/admin/question-banks/page.tsx`, `lib/validation/question-bank.ts`, `api/v1/question-banks` (create + PATCH) | Create/edit a bank or series with and without a subject; optional field persists | Implemented — optional `<Select>` after Category, wired through FormData + PATCH payload |

## Admin Mentorship Management

| Requirement | Implementing Module / File(s) | Verification Step | Status |
|---|---|---|---|
| Admin Mentorship product management | `dashboard/admin/mentors/**`, shared `question-banks/page.tsx` and `question-bank-sheet.tsx`, `api/v1/question-banks` | Admin opens `/dashboard/admin/mentors`, creates/edits/publishes/deletes a Mentorship product with category, subject, pricing, and thumbnail; confirm PDF controls are absent | Implemented — shared Question Bank architecture reused; TypeScript and Next production build pass; live authenticated workflow not exercised |

## Cashfree Payment Integration

Real Cashfree PG integration (follow-up to FR-17's mock-only phase). See `docs/CASHFREE-PLAN.md` and `docs/PAYMENT-SELF-HEALING.md`.

| Requirement | Implementing Module / File(s) | Verification Step | Status |
|---|---|---|---|
| Cashfree provider behind `PaymentProvider` seam | `lib/payment/cashfree-provider.ts`, `lib/payment/index.ts` | Create order → checkout → webhook → SUCCESS in prod | **Live in production** — real orders finalizing via `PAYMENT_SUCCESS_WEBHOOK` |
| Signature-verified webhook | `api/v1/payment/cashfree/webhook/route.ts` | Forged/unsigned POST → 401, purchase untouched | Implemented — `PGVerifyWebhookSignature`; invalid sigs logged as `SIGNATURE_INVALID` |
| Multi-attempt orders (`FAILED`/`CANCELLED` not terminal) | `lib/payment/finalize-purchase.ts` (`PROMOTABLE_TO_SUCCESS`) | Force a purchase FAILED, deliver SUCCESS for same order → promotes to SUCCESS once | Implemented — fixes a real prod incident (order `90f9e7ad…`) |
| Reconcile sweep (stuck PENDING, retried FAILED, missing invoice) | `lib/payment/reconcile-core.ts`, `api/v1/payment/reconcile/route.ts` | POST as admin / cron secret → JSON summary | Implemented — shared by admin button, per-row re-check, and the in-process timer |
| Self-heal without external cron | `src/instrumentation.ts` (timer), `lib/payment/heal.ts` (opportunistic on page loads) | Boot app → `RECONCILE_SWEEP_LOCK` event appears; load a stale purchase → self-corrects | Implemented — no Render Cron / GitHub Action; `PAYMENT_SELF_HEAL_SWEEP` toggle |

**Explicitly untraced (out of scope, per BRD § 5):** Phase 2 roadmap items; Cashfree refund *automation*, saved cards, EMI, subscriptions, Easy Split.

## Bugs found and fixed during verification

Real, reproducible bugs caught by an actual Playwright end-to-end run (not just type-checking/linting) — kept here as a record since they'd otherwise recur:

1. **Auth.js client couldn't find its own session endpoint** — `next-auth/react`'s `SessionProvider`/`signIn`/`signOut` default to `/api/auth/*`, but our API is versioned at `/api/v1/auth/*`. Fixed by setting `basePath: "/api/v1/auth"` on both the server `NextAuth()` config (`src/lib/auth.ts`) and the client `<SessionProvider basePath="...">` (`src/app/providers.tsx`) — both must agree, they're separate bundles.
2. **Dashboard crashed with a 500** — Lucide icon *component references* were passed as props from a Server Component (`layout.tsx`) into the Client Component `DashboardShell`, which violates RSC serialization rules (functions can't cross that boundary). Fixed by changing `NavItem.icon` to `React.ReactNode` and passing already-rendered elements (`<LayoutDashboard />`) instead of the component itself.
3. **Question bank upload always saved `previewEnabled: true`, even when unchecked** — classic `z.coerce.boolean()` footgun: `Boolean("false")` is `true` in JavaScript, so the FormData string `"false"` coerced to `true`. Fixed with a custom `booleanField()` preprocessor in `lib/validation/question-bank.ts` that checks the string value explicitly.
4. **Stored file paths used Windows backslashes** (`storage\questionbanks\...`), which would break on a Linux VPS in production. Fixed `lib/storage.ts` to always join paths with `/` regardless of host OS. *(Since superseded: `lib/storage.ts` now stores files on Cloudinary, not local disk — no host paths involved.)*

Also confirmed: Base UI (this project's shadcn primitive library) uses a `render` prop for polymorphism, not Radix's `asChild` — and its `Button` needs `nativeButton={false}` when rendering as a non-button element via `render` (handled centrally in `components/ui/button.tsx` so call sites don't need to think about it).
