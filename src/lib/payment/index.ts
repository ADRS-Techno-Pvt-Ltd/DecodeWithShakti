import type { PaymentProvider } from "./provider";
import { MockPaymentProvider } from "./mock-provider";

/**
 * Selects the active provider via PAYMENT_PROVIDER. Only "mock" is implemented
 * in this phase. "cashfree" is reserved for a separate follow-up plan — adding
 * it means implementing cashfree-provider.ts against the same PaymentProvider
 * interface and registering it below, nothing else in the app should need to change.
 */
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";
  switch (provider) {
    case "mock":
      return new MockPaymentProvider();
    default:
      throw new Error(
        `Unknown PAYMENT_PROVIDER "${provider}". Only "mock" is implemented in this phase.`,
      );
  }
}
