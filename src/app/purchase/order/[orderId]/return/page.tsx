import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Ban, Clock, RotateCcw } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth-guards";
import { Card, CardContent } from "@/components/ui/card";
import { OrderPendingPoller } from "./order-pending-poller";
import { AutoRedirect } from "../../../[orderId]/return/auto-redirect";
import { WhatsAppNotifyMentor } from "../../../[orderId]/return/whatsapp-notify-mentor";

const orderInclude = {
  user: true,
  purchases: { include: { questionBank: true, invoice: true } },
} satisfies Prisma.OrderInclude;
type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

/**
 * Multi-item counterpart to `/purchase/[orderId]/return` (that page renders
 * a single `Purchase`; this one renders an `Order` and its N child
 * `Purchase` rows — see docs/bundle-discount-plan.md § C, "don't overload
 * the existing single-item return page"). Same contract: renders DB status
 * only, never calls the payment provider directly, and hands a PENDING order
 * off to a client poller backed by the read-only
 * `GET /api/v1/cart/order/[orderId]` endpoint.
 */
export default async function OrderReturnPage({
  params,
}: PageProps<"/purchase/order/[orderId]/return">) {
  const { orderId } = await params;
  const session = await requireStudent();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order || order.userId !== session.user.id) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          <StatusView order={order} />
        </CardContent>
      </Card>
    </div>
  );
}

function ItemsList({ order }: { order: OrderWithRelations }) {
  return (
    <ul className="mt-4 flex flex-col gap-2 text-left">
      {order.purchases.map((purchase) => (
        <li
          key={purchase.id}
          className="flex items-center justify-between rounded-[9px] border border-border bg-accent/40 px-3.5 py-2.5 text-[13.5px]"
        >
          <span className="truncate pr-3">{purchase.questionBank.title}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-muted-foreground">{formatRupees(purchase.amount)}</span>
            {purchase.status === "SUCCESS" && purchase.questionBank.type !== "MENTORSHIP" && (
              <a
                href={`/api/v1/files/download/${purchase.id}`}
                className="font-medium text-primary hover:underline"
              >
                Download
              </a>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatusView({ order }: { order: OrderWithRelations }) {
  const buyAgainHref = "/question-banks";
  const mentorshipPurchase = order.purchases.find((p) => p.questionBank.type === "MENTORSHIP");

  switch (order.status) {
    case "PENDING":
      return <OrderPendingPoller orderId={order.id} itemCount={order.purchases.length} />;

    case "SUCCESS": {
      const hasMentorship = !!mentorshipPurchase;
      return (
        <>
          {/* Same reasoning as the single-item return page: mentorship needs
              the student to stay long enough to use the WhatsApp action. */}
          {!hasMentorship && <AutoRedirect href="/dashboard/student/purchases" delayMs={4000} />}
          <div className="mb-4 flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-xl font-bold">Purchase successful</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You now have access to {order.purchases.length} item
            {order.purchases.length === 1 ? "" : "s"}. Invoices have been generated.
          </p>
          <ItemsList order={order} />
          <div className="mt-6 flex flex-col gap-2.5">
            {mentorshipPurchase?.invoice && (
              <WhatsAppNotifyMentor
                purchaseId={mentorshipPurchase.id}
                studentName={order.user.name}
                studentPhone={order.user.phone ?? "Not provided"}
                mentorshipTitle={mentorshipPurchase.questionBank.title}
                invoiceNumber={mentorshipPurchase.invoice.invoiceNumber}
              />
            )}
            <SecondaryLink href="/dashboard/student/purchases">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );
    }

    case "FAILED":
      return (
        <>
          <div className="mb-4 flex justify-center">
            <XCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-xl font-bold">Purchase failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.failureReason ?? "Something went wrong with this payment. No charge was completed."}
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <PrimaryLink href={buyAgainHref}>Try again</PrimaryLink>
            <SecondaryLink href="/dashboard/student/purchases">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );

    case "CANCELLED":
      return (
        <>
          <div className="mb-4 flex justify-center">
            <Ban className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-xl font-bold">You cancelled this payment</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No charge was made. You can try again whenever you&apos;re ready.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <PrimaryLink href={buyAgainHref}>Try again</PrimaryLink>
            <SecondaryLink href="/dashboard/student/purchases">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );

    case "EXPIRED":
      return (
        <>
          <div className="mb-4 flex justify-center">
            <Clock className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-xl font-bold">This checkout expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The payment session timed out before it was completed.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <PrimaryLink href={buyAgainHref}>Start over</PrimaryLink>
            <SecondaryLink href="/dashboard/student/purchases">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );

    case "REFUNDED":
      return (
        <>
          <div className="mb-4 flex justify-center">
            <RotateCcw className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-xl font-bold">This order was refunded</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access to all items in this order has been revoked (refunds apply to the whole order).
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <SecondaryLink href="/dashboard/student/purchases">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );
  }
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full rounded-[9px] bg-primary-light py-3 text-center text-[15px] font-medium text-white transition-colors hover:bg-primary"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full rounded-[9px] border border-primary/30 py-3 text-center text-[15px] font-medium text-primary-dark transition-colors hover:bg-primary/10"
    >
      {children}
    </Link>
  );
}
