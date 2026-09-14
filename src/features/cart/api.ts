import type { CartItemType } from "@/stores/cart-store";

/**
 * Thin, defensive client for the cart endpoints, confirmed against Agent 1's
 * actual implementation at `src/app/api/v1/cart/{preview,create-order}/route.ts`
 * (see docs/bundle-discount-plan.md § B):
 *
 * Request body (both endpoints):
 *   { questionBankIds: string[], couponCode?: string, phone?: string }
 *
 * `preview` response:
 *   {
 *     subtotal: number, couponDiscountAmount: number, bundleDiscountAmount: number,
 *     bundleDiscountPercentApplied: number, total: number,
 *     items: { questionBankId: string, title: string, thumbnailPath: string | null, basePrice: number, amount: number }[],
 *   }
 *
 * `create-order` response:
 *   {
 *     orderId: string, redirectUrl: string | null, sessionId: string | null, free: boolean,
 *     expiresAt: string, subtotal, couponDiscountAmount, bundleDiscountAmount,
 *     bundleDiscountPercentApplied, amount,
 *     items: { questionBankId, title, basePrice, amount, purchaseId }[],
 *   }
 *   ...plus an `error` string (or zod flatten() object) with status != 2xx.
 *   A `PHONE_REQUIRED` error string signals the phone-capture step, same as
 *   the single-item flow.
 */

export type CartPreviewRequest = {
  questionBankIds: string[];
  couponCode?: string;
};

export type CartPreviewResponse = {
  subtotal: number;
  couponDiscountAmount: number;
  bundleDiscountAmount: number;
  bundleDiscountPercentApplied: number;
  total: number;
  items: {
    questionBankId: string;
    title: string;
    thumbnailPath: string | null;
    basePrice: number;
    amount: number;
    type?: CartItemType;
  }[];
};

export type CartCreateOrderRequest = {
  questionBankIds: string[];
  couponCode?: string;
  phone?: string;
};

export type CartCreateOrderResponse = {
  orderId: string;
  redirectUrl: string | null;
  sessionId: string | null;
  free: boolean;
  expiresAt: string | null;
  subtotal?: number;
  couponDiscountAmount?: number;
  bundleDiscountAmount?: number;
  bundleDiscountPercentApplied?: number;
  amount?: number;
  items?: { questionBankId: string; title: string; basePrice: number; amount: number; purchaseId?: string }[];
};

export class CartApiError extends Error {
  /** Set when the server responds with the well-known `PHONE_REQUIRED` sentinel. */
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

function firstFieldError(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const error = (body as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const fieldErrors = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    const first = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
    if (first) return first;
    const formErrors = (error as { formErrors?: string[] }).formErrors;
    if (formErrors?.[0]) return formErrors[0];
  }
  return undefined;
}

async function post<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => null);
  if (!res.ok) {
    const rawError =
      parsed && typeof parsed === "object" ? (parsed as { error?: unknown }).error : undefined;
    const code = typeof rawError === "string" ? rawError : undefined;
    throw new CartApiError(firstFieldError(parsed) ?? `Request failed (${res.status})`, code);
  }
  return parsed as TRes;
}

export async function previewCart(input: CartPreviewRequest): Promise<CartPreviewResponse> {
  return post("/api/v1/cart/preview", input);
}

export async function createCartOrder(
  input: CartCreateOrderRequest,
): Promise<CartCreateOrderResponse> {
  return post("/api/v1/cart/create-order", input);
}

/** Read-only order status, for the multi-item return page (this agent's own
 *  minimal endpoint — see `src/app/api/v1/cart/order/[orderId]/route.ts`). */
export type OrderStatusItem = {
  purchaseId: string;
  questionBankId: string;
  title: string;
  slug: string;
  type: CartItemType;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  invoiceId: string | null;
};

export type OrderStatusResponse = {
  orderId: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  amount: number;
  failureCode: string | null;
  failureReason: string | null;
  items: OrderStatusItem[];
};

export async function fetchOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  const res = await fetch(`/api/v1/cart/order/${orderId}`, { cache: "no-store" });
  const parsed = await res.json().catch(() => null);
  if (!res.ok) {
    throw new CartApiError(firstFieldError(parsed) ?? `Request failed (${res.status})`);
  }
  return parsed as OrderStatusResponse;
}
