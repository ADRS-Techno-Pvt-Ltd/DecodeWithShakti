import crypto from "crypto";
import Razorpay from "razorpay";
import type {
  PaymentProvider,
  PurchaseForOrder,
  CreateOrderResult,
  CallbackResult,
  PaymentOutcome,
} from "./provider";

// Razorpay amounts are already integer paise — no rupee/paise conversion needed
// anywhere in this file (unlike Cashfree, whose order_amount is in rupees).
const MAX_ORDER_AMOUNT_PAISE = 1_000_000 * 100; // parity with Cashfree's cap in cashfree-provider.ts

let cachedClient: Razorpay | null = null;

function client(): Razorpay {
  if (cachedClient) return cachedClient;
  cachedClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return cachedClient;
}

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  status?: string; // created | authorized | captured | refunded | failed
  method?: string;
  amount?: number; // paise
  error_code?: string;
  error_description?: string;
  created_at?: number;
};

/** Maps a payment entity's terminal status to our PaymentOutcome. Returns null for non-terminal states. */
function mapPaymentStatus(status: string | undefined): PaymentOutcome | null {
  switch (status) {
    case "captured":
      return "SUCCESS";
    case "failed":
      return "FAILED";
    case "refunded":
      return "REFUNDED";
    default: // created, authorized — not terminal (authorized-but-not-captured is treated as still-pending)
      return null;
  }
}

function toCallbackResult(providerOrderId: string, status: PaymentOutcome, payment?: RazorpayPaymentEntity): CallbackResult {
  return {
    providerOrderId,
    status,
    providerPaymentId: payment?.id,
    paymentMethod: payment?.method,
    paidAmount: payment?.amount,
    failureCode: payment?.error_code,
    failureReason: payment?.error_description,
  };
}

export class RazorpayProvider implements PaymentProvider {
  readonly name = "razorpay";

  async createOrder(purchase: PurchaseForOrder): Promise<CreateOrderResult> {
    if (purchase.amount > MAX_ORDER_AMOUNT_PAISE) {
      throw new Error(`order amount ${purchase.amount} paise exceeds the ${MAX_ORDER_AMOUNT_PAISE} paise cap.`);
    }

    const expiryMinutes = Number(process.env.RAZORPAY_ORDER_EXPIRY_MINUTES ?? "20");
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const order = await client().orders.create({
      amount: purchase.amount,
      currency: "INR",
      receipt: purchase.id,
      payment_capture: true,
      notes: {
        purchaseId: purchase.id,
        userId: purchase.userId,
        questionBankTitle: purchase.questionBankTitle,
      },
    });

    if (!order.id) {
      throw new Error("Razorpay order creation did not return an id.");
    }

    // Checkout.js only needs { key, order_id } — it pulls amount/currency from
    // the order itself, so nothing else needs to round-trip to the client.
    return { providerOrderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, expiresAt };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<CallbackResult | null> {
    const signature = headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !secret) return null;

    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
      return null; // signature mismatch — never throw out of verifyWebhook
    }

    let payload: {
      event?: string;
      payload?: {
        payment?: { entity?: RazorpayPaymentEntity };
        refund?: { entity?: { id?: string; payment_id?: string } };
      };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const payment = payload.payload?.payment?.entity;
    const refund = payload.payload?.refund?.entity;
    const orderId = payment?.order_id;
    if (!orderId) return null; // refund.processed payloads don't always carry order_id — no order, no finalize

    // Razorpay, unlike Cashfree (x-idempotency-key) or Stripe (evt_... id), sends
    // no dedicated event-id header or body field — the only official SDK header
    // is X-Razorpay-Signature. A payment/refund entity only ever fires a given
    // event type once, so `${event}:${entityId}` is a stable, deterministic
    // substitute for PaymentEvent's provider_eventId dedupe.
    switch (payload.event) {
      case "payment.captured":
        return {
          ...toCallbackResult(orderId, "SUCCESS", payment),
          eventId: `${payload.event}:${payment?.id}`,
          eventType: payload.event,
          rawPayload: payload,
        };
      case "payment.failed":
        return {
          ...toCallbackResult(orderId, "FAILED", payment),
          eventId: `${payload.event}:${payment?.id}`,
          eventType: payload.event,
          rawPayload: payload,
        };
      case "refund.processed":
        return {
          providerOrderId: orderId,
          status: "REFUNDED",
          eventId: `${payload.event}:${refund?.id ?? payment?.id}`,
          eventType: payload.event,
          rawPayload: payload,
        };
      default:
        return null; // unhandled event type — ignore, do not finalize
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<CallbackResult> {
    const rp = client();
    const order = await rp.orders.fetch(providerOrderId);

    if (order.status === "paid") {
      const payments = await rp.orders.fetchPayments(providerOrderId);
      const successPayment = (payments.items as RazorpayPaymentEntity[]).find((p) => p.status === "captured");
      return toCallbackResult(providerOrderId, "SUCCESS", successPayment);
    }

    // created/attempted alone can't distinguish "still trying" from "bank
    // declined" — that granularity only exists on the payment attempt.
    const payments = await rp.orders.fetchPayments(providerOrderId);
    const items = payments.items as RazorpayPaymentEntity[];
    const latest = [...items].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0];
    const outcome = mapPaymentStatus(latest?.status);
    if (outcome === "SUCCESS") return toCallbackResult(providerOrderId, "SUCCESS", latest);
    if (outcome === "FAILED") return toCallbackResult(providerOrderId, "FAILED", latest);
    if (outcome === "REFUNDED") return toCallbackResult(providerOrderId, "REFUNDED", latest);
    return { providerOrderId, status: "PENDING" };
  }
}
