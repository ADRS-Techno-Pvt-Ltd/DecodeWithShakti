import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth-guards";
import { getPaymentProvider } from "@/lib/payment";
import { finalizePurchase } from "@/lib/payment/finalize-purchase";
import { Card, CardContent } from "@/components/ui/card";

export default async function PurchaseReturnPage({
  params,
}: PageProps<"/purchase/[orderId]/return">) {
  const { orderId } = await params;
  const session = await requireStudent();

  const purchase = await prisma.purchase.findUnique({
    where: { id: orderId },
    include: { questionBank: true },
  });
  if (!purchase || purchase.userId !== session.user.id) notFound();

  if (purchase.status === "PENDING") {
    const provider = getPaymentProvider();
    const result = await provider.handleCallback({ providerOrderId: purchase.providerOrderId });
    await finalizePurchase(result);
  }

  const updated = await prisma.purchase.findUnique({ where: { id: orderId } });
  const success = updated?.status === "SUCCESS";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-4 flex justify-center">
            {success ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
            ) : (
              <XCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} />
            )}
          </div>
          <h1 className="font-heading text-xl font-bold">
            {success ? "Purchase successful" : "Purchase failed"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {success
              ? `You now have access to "${purchase.questionBank.title}". An invoice has been generated.`
              : "Something went wrong with this payment. No charge was completed."}
          </p>
          <Link
            href="/dashboard/student"
            className="mt-6 block w-full rounded-[9px] bg-primary-light py-3 text-center text-[15px] font-medium text-white transition-colors hover:bg-primary"
          >
            Go to My Purchases
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
