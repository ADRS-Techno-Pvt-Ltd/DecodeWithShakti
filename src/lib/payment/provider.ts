/**
 * The seam real Cashfree integration plugs into later (separate, follow-up plan).
 * Every provider implementation must satisfy this interface — nothing outside
 * lib/payment/ should reference a specific provider's internals.
 */

export type PurchaseForOrder = {
  id: string;
  amount: number; // paise, already resolved (early-bird + coupon applied)
  userEmail: string;
  questionBankTitle: string;
};

export type CreateOrderResult = {
  providerOrderId: string;
  /** Where the client should be sent to complete (or, for the mock provider, immediately "complete") payment. */
  redirectUrl: string;
};

export type CallbackResult = {
  providerOrderId: string;
  status: "SUCCESS" | "FAILED";
  providerPaymentId?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createOrder(purchase: PurchaseForOrder): Promise<CreateOrderResult>;
  handleCallback(payload: unknown): Promise<CallbackResult>;
}
