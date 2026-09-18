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
 * Selects the active provider via PAYMENT_PROVIDER. Adding a new provider means
 * implementing it against the PaymentProvider interface and registering it
 * below — nothing else in the app should need to change. See docs/CASHFREE-PLAN.md.
 */
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";

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
