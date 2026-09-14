import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment";
import { finalizePurchase } from "@/lib/payment/finalize-purchase";
import { finalizeOrder } from "@/lib/payment/finalize-order";

// Needs the raw request body + Node crypto (via the cashfree-pg SDK) — no edge runtime.
export const runtime = "nodejs";

function safeJsonParse(raw: string): Prisma.InputJsonValue {
  try {
    return JSON.parse(raw) as Prisma.InputJsonValue;
  } catch {
    return { raw };
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Server-to-server endpoint, protected by signature only (no session guard —
 * src/proxy.ts's matcher is ["/dashboard/:path*"], so this route is already
 * outside it). Always returns 200 on anything signature-verified — including
 * unknown orders and already-finalized ones — so Cashfree stops retrying.
 * 401 only on bad signature; 500 only on our own unexpected failure (so
 * Cashfree *does* retry). See docs/CASHFREE-PLAN.md § 5.
 */
export async function POST(request: Request) {
  const raw = await request.text(); // raw body, read before any parsing — signature is over these exact bytes
  const provider = getPaymentProvider();

  const result = await provider.verifyWebhook(raw, request.headers);
  if (!result) {
    await prisma.paymentEvent
      .create({
        data: {
          provider: provider.name,
          eventId: request.headers.get("x-idempotency-key") ?? `invalid:${crypto.randomUUID()}`,
          eventType: "SIGNATURE_INVALID",
          signatureValid: false,
          rawPayload: safeJsonParse(raw),
        },
      })
      .catch(() => {}); // best-effort audit log — never let logging failure change the 401
    return new Response("invalid signature", { status: 401 });
  }

  const eventId = result.eventId ?? `unknown:${result.providerOrderId}:${crypto.randomUUID()}`;

  // Cart-originated multi-item checkouts create an Order keyed by
  // providerOrderId (Purchase.providerOrderId is per-item synthetic in that
  // case, see docs/bundle-discount-plan.md § A) — check Order first, and only
  // fall back to the existing single-item Purchase lookup when it's not one.
  const order = await prisma.order.findUnique({ where: { providerOrderId: result.providerOrderId } });

  if (order) {
    // PaymentEvent has no orderId column — link it to one of the order's
    // child purchases (if any exist yet) for traceability, but leave it null
    // rather than change the PaymentEvent schema for this.
    const firstChildPurchase = await prisma.purchase.findFirst({
      where: { orderId: order.id },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    try {
      await prisma.paymentEvent.create({
        data: {
          provider: provider.name,
          eventId,
          eventType: result.eventType ?? "UNKNOWN",
          purchaseId: firstChildPurchase?.id,
          providerOrderId: result.providerOrderId,
          signatureValid: true,
          rawPayload: (result.rawPayload as Prisma.InputJsonValue | undefined) ?? {},
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return new Response("ok", { status: 200 }); // redelivery of an event we've already logged
      }
      throw err;
    }

    try {
      await finalizeOrder(result);
      await prisma.paymentEvent.update({
        where: { provider_eventId: { provider: provider.name, eventId } },
        data: { processedAt: new Date() },
      });
    } catch (err) {
      await prisma.paymentEvent
        .update({
          where: { provider_eventId: { provider: provider.name, eventId } },
          data: { error: err instanceof Error ? err.message : String(err) },
        })
        .catch(() => {});
      return new Response("internal error", { status: 500 }); // let Cashfree retry
    }

    return new Response("ok", { status: 200 });
  }

  const purchase = await prisma.purchase.findUnique({ where: { providerOrderId: result.providerOrderId } });

  try {
    await prisma.paymentEvent.create({
      data: {
        provider: provider.name,
        eventId,
        eventType: result.eventType ?? "UNKNOWN",
        purchaseId: purchase?.id,
        providerOrderId: result.providerOrderId,
        signatureValid: true,
        rawPayload: (result.rawPayload as Prisma.InputJsonValue | undefined) ?? {},
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return new Response("ok", { status: 200 }); // redelivery of an event we've already logged
    }
    throw err;
  }

  try {
    await finalizePurchase(result);
    await prisma.paymentEvent.update({
      where: { provider_eventId: { provider: provider.name, eventId } },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    await prisma.paymentEvent
      .update({
        where: { provider_eventId: { provider: provider.name, eventId } },
        data: { error: err instanceof Error ? err.message : String(err) },
      })
      .catch(() => {});
    return new Response("internal error", { status: 500 }); // let Cashfree retry
  }

  return new Response("ok", { status: 200 });
}
