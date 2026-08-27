/**
 * The seam real Cashfree integration plugs into. Every provider implementation
 * must satisfy this interface — nothing outside lib/payment/ should reference
 * a specific provider's internals. See docs/CASHFREE-PLAN.md for the full
 * payment state machine this interface exists to support.
 */

export type PaymentOutcome = "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED" | "PENDING" | "REFUNDED";

export type PurchaseForOrder = {
  id: string;
  amount: number; // paise, already resolved (early-bird + coupon applied)
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  questionBankTitle: string;
  returnUrl: string;
};

export type CreateOrderResult = {
  providerOrderId: string;
  /** Mock only — where to send the client to "complete" the mock purchase. */
  redirectUrl?: string;
  /** Cashfree payment_session_id, used by the client-side checkout SDK. */
  sessionId?: string;
  expiresAt?: Date;
};

export type CallbackResult = {
  providerOrderId: string;
  status: PaymentOutcome;
  providerPaymentId?: string;
  /** upi | card | netbanking | wallet */
  paymentMethod?: string;
  /** paise — verified against Purchase.amount before granting access */
  paidAmount?: number;
  /** Stable, machine-readable reason (e.g. Cashfree error_reason) — safe to filter/branch on */
  failureCode?: string;
  /** Human-readable description — display/log only, never branched on */
  failureReason?: string;
  /** Idempotency key for PaymentEvent dedupe (x-idempotency-key for webhooks, "poll:<uuid>" for sweeps) */
  eventId?: string;
  eventType?: string;
  rawPayload?: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  createOrder(purchase: PurchaseForOrder): Promise<CreateOrderResult>;
  /** Verify + parse an inbound provider webhook. Returns null if the signature is invalid — never throw. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<CallbackResult | null>;
  /** Poll the provider for an order's current status (fallback when a webhook is late or lost). */
  getOrderStatus(providerOrderId: string): Promise<CallbackResult>;
}
