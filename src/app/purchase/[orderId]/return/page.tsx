import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Ban, Clock, RotateCcw } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth-guards";
import { Card, CardContent } from "@/components/ui/card";
import { PendingPoller } from "./pending-poller";

const purchaseInclude = { questionBank: true, invoice: true } satisfies Prisma.PurchaseInclude;
type PurchaseWithRelations = Prisma.PurchaseGetPayload<{ include: typeof purchaseInclude }>;

/**
 * Renders the purchase's current DB status only — never calls the payment
 * provider and never trusts a query string. Fulfillment is decided solely by
 * the webhook and the reconcile sweep (see docs/CASHFREE-PLAN.md § 1, "the
 * bypass fix"). A PENDING purchase hands off to a client poller that hits the
 * backend-verified /api/v1/purchase/verify endpoint.
 */
export default async function PurchaseReturnPage({
  params,
}: PageProps<"/purchase/[orderId]/return">) {
  const { orderId: purchaseId } = await params;
  const session = await requireStudent();

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: purchaseInclude,
  });
  if (!purchase || purchase.userId !== session.user.id) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <StatusView purchase={purchase} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusView({ purchase }: { purchase: PurchaseWithRelations }) {
  const buyAgainHref = `/question-banks/${purchase.questionBank.slug}`;

  switch (purchase.status) {
    case "PENDING":
      return (
        <PendingPoller purchaseId={purchase.id} questionBankTitle={purchase.questionBank.title} />
      );

    case "SUCCESS":
      return (
        <>
          <Icon><CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} /></Icon>
          <Heading>Purchase successful</Heading>
          <Message>
            You now have access to &ldquo;{purchase.questionBank.title}&rdquo;. An invoice has
            been generated.
          </Message>
          <div className="mt-6 flex flex-col gap-2.5">
            <PrimaryLink href={`/api/v1/files/download/${purchase.id}`}>Download PDF</PrimaryLink>
            {purchase.invoice && (
              <SecondaryLink href={`/api/v1/files/invoice/${purchase.invoice.id}`}>
                Download invoice
              </SecondaryLink>
            )}
            <SecondaryLink href="/dashboard/student">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );

    case "FAILED":
      return (
        <>
          <Icon><XCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} /></Icon>
          <Heading>Purchase failed</Heading>
          <Message>
            {purchase.failureReason ?? "Something went wrong with this payment. No charge was completed."}
          </Message>
          <div className="mt-6 flex flex-col gap-2.5">
            <PrimaryLink href={buyAgainHref}>Try again</PrimaryLink>
            <SecondaryLink href="/dashboard/student">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );

    case "CANCELLED":
      return (
        <>
          <Icon><Ban className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} /></Icon>
          <Heading>You cancelled this payment</Heading>
          <Message>No charge was made. You can try again whenever you&apos;re ready.</Message>
          <div className="mt-6 flex flex-col gap-2.5">
            <PrimaryLink href={buyAgainHref}>Try again</PrimaryLink>
            <SecondaryLink href="/dashboard/student">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );

    case "EXPIRED":
      return (
        <>
          <Icon><Clock className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} /></Icon>
          <Heading>This checkout expired</Heading>
          <Message>The payment session timed out before it was completed.</Message>
          <div className="mt-6 flex flex-col gap-2.5">
            <PrimaryLink href={buyAgainHref}>Start over</PrimaryLink>
            <SecondaryLink href="/dashboard/student">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );

    case "REFUNDED":
      return (
        <>
          <Icon><RotateCcw className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} /></Icon>
          <Heading>This purchase was refunded</Heading>
          <Message>Access to &ldquo;{purchase.questionBank.title}&rdquo; has been revoked.</Message>
          <div className="mt-6 flex flex-col gap-2.5">
            {purchase.invoice && (
              <SecondaryLink href={`/api/v1/files/invoice/${purchase.invoice.id}`}>
                Download invoice
              </SecondaryLink>
            )}
            <SecondaryLink href="/dashboard/student">Go to My Purchases</SecondaryLink>
          </div>
        </>
      );
  }
}

function Icon({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex justify-center">{children}</div>;
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h1 className="font-heading text-xl font-bold">{children}</h1>;
}

function Message({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>;
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
