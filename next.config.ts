import type { NextConfig } from "next";

// Cashfree's checkout SDK loads an iframe/scripts from its own domains for the
// payment modal — these must stay allowed or checkout breaks. See
// src/lib/payment/use-cashfree-sdk.ts and docs/CASHFREE-PLAN.md § 6.
const CASHFREE_DOMAINS = "https://sdk.cashfree.com https://*.cashfree.com";

// React/Next dev mode (Fast Refresh, the error overlay's stack-trace
// reconstruction) needs eval() — production never uses it. Scoping this to
// dev only keeps the deployed CSP strict.
const devOnlyScriptSrc = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required for Next.js's own inline bootstrap scripts
  // (no nonce wiring in this app yet) — the main XSS mitigation here is that
  // there is no dangerouslySetInnerHTML anywhere in the codebase, so there is
  // no obvious injection point for this to matter in practice.
  `script-src 'self' 'unsafe-inline'${devOnlyScriptSrc} ${CASHFREE_DOMAINS}`,
  "style-src 'self' 'unsafe-inline'", // Tailwind + inline style props
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:", // next/font self-hosts at build time — no runtime Google Fonts calls
  `connect-src 'self' ${CASHFREE_DOMAINS}`,
  `frame-src ${CASHFREE_DOMAINS}`, // Cashfree Drop-in payment modal
  "object-src 'none'",
  "base-uri 'self'",
  // Cashfree's Drop-in SDK submits a real form POST to its hosted checkout
  // page (e.g. .../pg/view/sessions/checkout) even in modal mode — must stay
  // allowed here too, not just frame-src/connect-src, or checkout is blocked.
  `form-action 'self' ${CASHFREE_DOMAINS}`,
  "frame-ancestors 'none'", // this site itself must never be framed (clickjacking)
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
