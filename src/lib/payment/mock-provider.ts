import type { PaymentProvider, PurchaseForOrder, CreateOrderResult, CallbackResult } from "./provider";

/**
 * This phase's only PaymentProvider implementation. Completes a purchase instantly —
 * no external network call, no API keys — so the rest of the purchase chain
 * (finalize-purchase, invoice generation, coupon accounting, watermarked download)
 * can be built and tested without a real gateway. Real Cashfree integration is a
 * separate follow-up plan; see docs/HLD.md § 4.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createOrder(purchase: PurchaseForOrder): Promise<CreateOrderResult> {
    return {
      providerOrderId: `mock_${purchase.id}`,
      redirectUrl: `/purchase/${purchase.id}/return?mock=success`,
    };
  }

  async handleCallback(payload: unknown): Promise<CallbackResult> {
    const { providerOrderId } = payload as { providerOrderId: string };
    return { providerOrderId, status: "SUCCESS", providerPaymentId: `mock_pay_${providerOrderId}` };
  }
}
