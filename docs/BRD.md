# Business Requirements Document (BRD)

## LMS Question Bank Purchase Platform

**Client:** Shakti Tiwari
**Vendor:** ADRS Techno Pvt. Ltd., Jabalpur, Madhya Pradesh, India
**Source:** `ADRS_Techno_Quotation_LMS_Phase1_Verbatim.pdf` (signed quotation), plus additions requested directly by the client during planning.
**Status:** Living document — updated as scope changes are agreed.

---

## 1. Business Objective

Launch a question-bank marketplace where a single admin uploads downloadable exam-prep question banks (PDF), and students browse, preview, purchase, and download them through an authenticated platform. **The platform is focused specifically on CA (Chartered Accountancy) exam preparation** — CA Foundation, Inter, and Final — and is personally mentored/authored by **CA Shakti Tiwari**, whose credibility as a practicing Chartered Accountant is the platform's core trust signal (the mentor-led branding pattern used by platforms like Physics Wallah, where the founder/mentor's photo and credentials are prominently featured). This is the first phase of what will grow into a full-fledged LMS (quizzes, courses, subscriptions, analytics — see Phase 2 roadmap in the original quotation).

## 2. Stakeholders

| Stakeholder | Role |
|---|---|
| Shakti Tiwari | Client — product owner, single admin user |
| ADRS Techno Pvt. Ltd. (Mr. Abhishek Dubey, Director) | Vendor — development |
| Students | End users — browse, preview, purchase, download |

## 3. Functional Requirements

### 3.1 Landing Page
- FR-1: Public landing page with Hero, Features, Pricing, Testimonials, FAQ sections.
- FR-2: Fully responsive (mobile + desktop). Standard/basic animations only — no custom motion design.
- FR-1a *(client addition)*: A "Meet Your Mentor" section featuring CA Shakti Tiwari — photo, credentials (Chartered Accountant, founder), short bio/quote, and trust stats (experience, students guided, question banks authored). Placed prominently near the top of the landing page, mirroring the founder/mentor showcase pattern used by exam-prep platforms like Physics Wallah. **Requires a real photo of CA Shakti Tiwari and final bio copy/stats from the client before launch** — the mockup uses a placeholder.

### 3.2 Authentication & Accounts
- FR-3: Email/password login for both Admin and Student.
- FR-4: Forgot/reset password flow (email-based token).
- FR-5: Student dashboard — purchase history and access to bought question banks.
- FR-6: Admin dashboard — upload, manage, and track sales.
- FR-7: Single admin account only — no multi-admin/team roles.

### 3.3 Question Bank Management
- FR-8: Admin uploads question banks as downloadable PDF files.
- FR-9: Basic single-level categorization by CA level/subject (e.g. CA Foundation, CA Inter — Costing, CA Final — Audit).
- FR-10: Admin-configurable preview — toggle preview on/off per question bank; set number of preview pages when enabled.

### 3.4 Early Bird Pricing *(client addition, beyond original quotation)*
- FR-11: Admin can set a discounted "early bird" price and an end date/time per question bank. The discounted price applies automatically until the deadline, then reverts to the regular price.

### 3.5 Coupon Codes *(client addition, beyond original quotation)*
- FR-12: Admin can create coupon codes with an expiry date and a total usage limit (global — not per-user, not scoped to a specific bank).
- FR-13: Coupon codes are validated at checkout (active, not expired, under usage limit) and the discount is computed server-side.

### 3.6 PDF Watermark *(client addition, beyond original quotation)*
- FR-14: Every downloaded (purchased) file is stamped with the logged-in student's email, diagonally, on every page, to deter unauthorized redistribution. Preview files and the admin's stored original are never watermarked.

### 3.7 Payment & Purchase
- FR-15: One-time purchase only — no subscriptions, no refund automation.
- FR-16: Auto-generated PDF invoice per successful purchase.
- FR-17 *(scope note)*: Real Cashfree payment-gateway integration is **explicitly deferred** to a separate follow-up plan, per client instruction. This phase implements a pluggable payment-provider abstraction with a mock provider so the rest of the purchase chain (invoicing, download unlock, coupon accounting) is fully functional and testable now.

### 3.8 Deployment
- FR-18: Deployment on client-owned AWS/VPS environment.
- FR-19: Basic system monitoring (health-check endpoint).

## 4. Non-Functional Requirements

- NFR-1: Responsive UI across mobile and desktop.
- NFR-2: Professional, trust-first visual design appropriate for exam-prep coaching audiences (see `docs/HLD.md` § UI/Design System).
- NFR-3: Architecture must scale toward a full LMS (proper state management, versioned APIs, feature-folder structure) rather than being a disposable MVP.
- NFR-4: Full file downloads and invoices are only ever served to the authenticated, verified purchaser (authorization-checked routes).
- NFR-5: Basic uptime/health monitoring; nightly database + storage backups.
- NFR-6: No vendor lock-in — all third-party accounts (payment gateway, hosting) owned and controlled by the client.

## 5. Out of Scope (this phase)

- Everything in the original quotation's Phase 2 roadmap: online quiz/test engine, course/video content, subscriptions & advanced billing, multi-admin/team management, analytics/reporting dashboards, AI-powered features, live classes/webinars, bulk CSV upload, question bank versioning, notification center.
- Real Cashfree API integration (order creation, webhook signature verification, live checkout redirect) — deferred to a separate follow-up plan (see `docs/HLD.md` § Payment Provider Abstraction).

## 6. Success Criteria

- Admin can upload a question bank, configure preview and early-bird pricing, and see it listed correctly for students.
- A student can browse, preview, apply a valid coupon, complete a (mock) purchase, and download a watermarked copy of the file.
- An invoice is generated automatically on successful purchase and is downloadable only by the purchaser.
- The app deploys cleanly to a client-owned VPS and reports healthy via `/api/v1/health`.
- `docs/RTM.md` shows every requirement above traced to an implementing module and a verification step.
