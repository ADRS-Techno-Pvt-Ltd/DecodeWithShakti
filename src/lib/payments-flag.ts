/**
 * Sitewide payments kill switch, toggled purely via env var (no code change
 * needed to flip it) — set NEXT_PUBLIC_PAYMENTS_DISABLED="true" to block all
 * checkout/purchase entry points and show PAYMENTS_DISABLED_MESSAGE instead.
 * NEXT_PUBLIC_ because both client components (cart page, purchase card) and
 * server routes (create-order) need to read it.
 */
export const PAYMENTS_DISABLED = process.env.NEXT_PUBLIC_PAYMENTS_DISABLED === "true";

export const PAYMENTS_DISABLED_MESSAGE =
  process.env.NEXT_PUBLIC_PAYMENTS_DISABLED_MESSAGE ??
  "Payments are temporarily down for maintenance. We expect to be back within 24 hours.";
