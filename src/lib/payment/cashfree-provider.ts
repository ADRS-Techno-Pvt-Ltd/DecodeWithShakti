import { Cashfree, CFEnvironment, type PaymentEntity } from "cashfree-pg";
import type {
  PaymentProvider,
  PurchaseForOrder,
  CreateOrderResult,
  CallbackResult,
  PaymentOutcome,
} from "./provider";

const CASHFREE_API_VERSION = "2025-01-01"; // published contract — SDK's internal default ("2026-01-01") isn't a public API version

function client(): Cashfree {
  const env = process.env.CASHFREE_ENV === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  const cf = new Cashfree(env, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);
  cf.XApiVersion = CASHFREE_API_VERSION;
  return cf;
}

/** Cashfree's order_amount cap (rupees) — validated before calling out so we get a clean error, not their 400. */
const MAX_ORDER_AMOUNT_RUPEES = 1_000_000;

function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Maps a payment attempt's terminal payment_status to our PaymentOutcome. Returns null for non-terminal states. */
function mapPaymentStatus(status: string | undefined): PaymentOutcome | null {
  switch (status) {
    case "SUCCESS":
      return "SUCCESS";
    case "FAILED":
    case "VOID":
      return "FAILED";
    case "USER_DROPPED":
    case "CANCELLED":
      return "CANCELLED";
    default: // NOT_ATTEMPTED, PENDING, or unrecognized — no terminal signal yet
      return null;
  }
}

function toCallbackResult(providerOrderId: string, status: PaymentOutcome, payment?: PaymentEntity): CallbackResult {
  return {
    providerOrderId,
    status,
    providerPaymentId: payment?.cf_payment_id,
    paymentMethod: payment?.payment_group,
    // order_amount, not payment_amount: order_amount is what WE set at order
    // creation and is immutable — the right thing to validate against.
    // payment_amount is what actually changed hands and legitimately runs
    // lower than order_amount whenever a Cashfree Offer (bank/instant
    // discount) applies — that's a discount, not fraud or a bug, and
    // order_status=PAID means Cashfree considers the order fully settled
    // regardless. Comparing against payment_amount instead would falsely
    // flag every offer-discounted payment as an amount mismatch.
    paidAmount: payment?.order_amount != null ? rupeesToPaise(payment.order_amount) : undefined,
    failureCode: payment?.error_details?.error_reason,
    failureReason: payment?.error_details?.error_description,
  };
}

export class CashfreeProvider implements PaymentProvider {
  readonly name = "cashfree";

  async createOrder(purchase: PurchaseForOrder): Promise<CreateOrderResult> {
    const orderAmount = paiseToRupees(purchase.amount);
    if (orderAmount > MAX_ORDER_AMOUNT_RUPEES) {
      throw new Error(`order_amount ${orderAmount} exceeds Cashfree's ${MAX_ORDER_AMOUNT_RUPEES} cap.`);
    }

    const expiryMinutes = Number(process.env.CASHFREE_ORDER_EXPIRY_MINUTES ?? "20");
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const response = await client().PGCreateOrder({
      order_id: purchase.id,
      order_amount: orderAmount,
      order_currency: "INR",
      order_expiry_time: expiresAt.toISOString(),
      customer_details: {
        customer_id: purchase.userId,
        customer_name: purchase.userName,
        customer_email: purchase.userEmail,
        customer_phone: purchase.userPhone,
      },
      order_meta: {
        // Static path — Cashfree appends ?order_id=... itself; never interpolate {order_id} here.
        return_url: purchase.returnUrl,
      },
    });

    const order = response.data;
    if (!order.order_id || !order.payment_session_id) {
      throw new Error("Cashfree order creation did not return an order_id/payment_session_id.");
    }

    return { providerOrderId: order.order_id, sessionId: order.payment_session_id, expiresAt };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<CallbackResult | null> {
    const signature = headers.get("x-webhook-signature");
    const timestamp = headers.get("x-webhook-timestamp");
    if (!signature || !timestamp) return null;

    let event;
    try {
      event = client().PGVerifyWebhookSignature(signature, rawBody, timestamp);
    } catch {
      return null; // signature mismatch — never throw out of verifyWebhook
    }

    const eventId = headers.get("x-idempotency-key") ?? undefined;
    const payload = event.object as {
      type?: string;
      data?: {
        order?: { order_id?: string };
        payment?: PaymentEntity;
        refund?: { order_id?: string; refund_status?: string };
        error_details?: { error_reason?: string; error_description?: string };
      };
    };

    const orderId = payload.data?.order?.order_id ?? payload.data?.refund?.order_id;
    if (!orderId) return null;

    switch (event.type) {
      case "PAYMENT_SUCCESS_WEBHOOK": {
        const payment = payload.data?.payment;
        const outcome = mapPaymentStatus(payment?.payment_status) ?? "PENDING";
        return { ...toCallbackResult(orderId, outcome, payment), eventId, eventType: event.type, rawPayload: payload };
      }
      case "PAYMENT_FAILED_WEBHOOK": {
        const payment = payload.data?.payment;
        return { ...toCallbackResult(orderId, "FAILED", payment), eventId, eventType: event.type, rawPayload: payload };
      }
      case "PAYMENT_USER_DROPPED_WEBHOOK": {
        const payment = payload.data?.payment;
        return { ...toCallbackResult(orderId, "CANCELLED", payment), eventId, eventType: event.type, rawPayload: payload };
      }
      case "REFUND_STATUS_WEBHOOK": {
        if (payload.data?.refund?.refund_status !== "SUCCESS") return null; // ignore non-terminal refund updates
        return { providerOrderId: orderId, status: "REFUNDED", eventId, eventType: event.type, rawPayload: payload };
      }
      default:
        return null; // unhandled event type — ignore, do not finalize
    }
  }

  async getOrderStatus(providerOrderId: string): Promise<CallbackResult> {
    const cf = client();
    const order = (await cf.PGFetchOrder(providerOrderId)).data;

    if (order.order_status === "PAID") {
      const payments = (await cf.PGOrderFetchPayments(providerOrderId)).data;
      const successPayment = payments.find((p) => p.payment_status === "SUCCESS");
      return toCallbackResult(providerOrderId, "SUCCESS", successPayment);
    }
    if (order.order_status === "EXPIRED") {
      return { providerOrderId, status: "EXPIRED" };
    }
    if (order.order_status === "TERMINATED" || order.order_status === "TERMINATION_REQUESTED") {
      return { providerOrderId, status: "CANCELLED" };
    }

    // ACTIVE (or unrecognized): order_status alone can't distinguish "still
    // trying" from "user gave up" from "bank declined" — that granularity
    // only exists on the payment attempt.
    const payments = (await cf.PGOrderFetchPayments(providerOrderId)).data;
    const latest = payments[0]; // most recent attempt first
    const outcome = mapPaymentStatus(latest?.payment_status);
    if (outcome === "SUCCESS") return toCallbackResult(providerOrderId, "SUCCESS", latest);
    if (outcome === "FAILED") return toCallbackResult(providerOrderId, "FAILED", latest);
    if (outcome === "CANCELLED") return toCallbackResult(providerOrderId, "CANCELLED", latest);
    return { providerOrderId, status: "PENDING" };
  }
}
