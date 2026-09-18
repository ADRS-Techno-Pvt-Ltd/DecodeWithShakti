import type { PaymentProvider } from "./provider";
import { MockPaymentProvider } from "./mock-provider";
import { CashfreeProvider } from "./cashfree-provider";
import { RazorpayProvider } from "./razorpay-provider";

// Note: webhook signature verification uses XClientSecret (CASHFREE_SECRET_KEY)
// internally in the cashfree-pg SDK — there is no separate webhook secret.
const REQUIRED_CASHFREE_ENV_VARS = ["CASHFREE_ENV", "CASHFREE_APP_ID", "CASHFREE_SECRET_KEY"] as const;

// Razorpay, unlike Cashfree, verifies webhooks against a dedicated webhook
// secret (set in the Razorpay dashboard) — not the API key_secret.
const REQUIRED_RAZORPAY_ENV_VARS = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"] as const;

/**
 * Selects a provider. With no argument, selects the globally active one via
 * PAYMENT_PROVIDER (used by checkout, webhooks, and the bulk reconcile sweep).
 * An explicit `nameOverride` builds a specific named provider regardless of
 * PAYMENT_PROVIDER — used only for re-checking one specific purchase by the
 * provider that actually created it (e.g. an admin's "Re-check payment" on an
 * old Cashfree purchase after PAYMENT_PROVIDER has since switched to
 * razorpay). Requires that provider's env vars to still be configured.
 *
 * Adding a new provider means implementing it against the PaymentProvider
 * interface and registering it below — nothing else in the app should need
 * to change. See docs/CASHFREE-PLAN.md.
 */
export function getPaymentProvider(nameOverride?: string): PaymentProvider {
  const provider = nameOverride ?? process.env.PAYMENT_PROVIDER ?? "mock";

  if (provider === "mock" && process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    throw new Error("Refusing to run MockPaymentProvider in production. Set ALLOW_MOCK_PAYMENTS=true to override.");
  }

  switch (provider) {
    case "mock":
      return new MockPaymentProvider();
    case "cashfree": {
      const missing = REQUIRED_CASHFREE_ENV_VARS.filter((name) => !process.env[name]);
      if (missing.length > 0) {
        throw new Error(`PAYMENT_PROVIDER=cashfree requires env var(s): ${missing.join(", ")}`);
      }
      return new CashfreeProvider();
    }
    case "razorpay": {
      const missing = REQUIRED_RAZORPAY_ENV_VARS.filter((name) => !process.env[name]);
      if (missing.length > 0) {
        throw new Error(`PAYMENT_PROVIDER=razorpay requires env var(s): ${missing.join(", ")}`);
      }
      return new RazorpayProvider();
    }
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER "${provider}".`);
  }
}
