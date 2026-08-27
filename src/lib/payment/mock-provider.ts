import type {
  PaymentProvider,
  PurchaseForOrder,
  CreateOrderResult,
  CallbackResult,
  PaymentOutcome,
} from "./provider";

/**
 * This phase's only PaymentProvider implementation. Completes a purchase instantly —
 * no external network call, no API keys — so the rest of the purchase chain
 * (finalize-purchase, invoice generation, coupon accounting, watermarked download)
 * can be built and tested without a real gateway.
 *
 * MOCK_PAYMENT_OUTCOME lets every branch of the state machine (success, failed,
 * cancelled, pending/stuck) be exercised locally without Cashfree credentials —
 * see docs/CASHFREE-PLAN.md § 3 and § 10.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  private outcome(): PaymentOutcome {
    const raw = process.env.MOCK_PAYMENT_OUTCOME ?? "success";
    switch (raw) {
      case "failed":
        return "FAILED";
      case "cancelled":
        return "CANCELLED";
      case "pending":
        return "PENDING";
      default:
        return "SUCCESS";
    }
  }

  async createOrder(purchase: PurchaseForOrder): Promise<CreateOrderResult> {
    return {
      providerOrderId: purchase.id,
      redirectUrl: `/purchase/${purchase.id}/return`,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    };
  }

  async verifyWebhook(rawBody: string): Promise<CallbackResult | null> {
    // The mock has no real webhook delivery — this exists only so the
    // interface is fully implemented. Not exercised by the mock purchase flow.
    const parsed = JSON.parse(rawBody) as { providerOrderId: string };
    return {
      providerOrderId: parsed.providerOrderId,
      status: this.outcome(),
      providerPaymentId: `mock_pay_${parsed.providerOrderId}`,
      eventId: `mock:${parsed.providerOrderId}:${Date.now()}`,
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<CallbackResult> {
    const status = this.outcome();
    const base: CallbackResult = { providerOrderId, eventId: `poll:${providerOrderId}`, status };
    if (status === "SUCCESS") {
      return { ...base, providerPaymentId: `mock_pay_${providerOrderId}`, paymentMethod: "mock" };
    }
    if (status === "FAILED") {
      return { ...base, failureCode: "mock_declined", failureReason: "Mock payment was declined." };
    }
    return base;
  }
}
