import { Receipt, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/landing/reveal";
import { ReconcileButton } from "@/components/dashboard/reconcile-button";
import { RecheckPaymentButton } from "@/components/dashboard/recheck-payment-button";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

const statusBadge: Record<string, React.ReactNode> = {
  SUCCESS: <StatusBadge tone="success">Success</StatusBadge>,
  PENDING: <StatusBadge tone="warning">Pending</StatusBadge>,
  FAILED: <StatusBadge tone="destructive">Failed</StatusBadge>,
  CANCELLED: <StatusBadge tone="muted">Cancelled</StatusBadge>,
  EXPIRED: <StatusBadge tone="muted">Expired</StatusBadge>,
  REFUNDED: <StatusBadge tone="muted">Refunded</StatusBadge>,
};

export default async function AdminSalesPage() {
  const purchases = await prisma.purchase.findMany({
    include: { user: true, questionBank: true, invoice: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground text-sm">{purchases.length} purchases (most recent 200).</p>
        </div>
        <ReconcileButton />
      </div>

      <Reveal delay={60}>
        <div className="mt-6 rounded-lg border bg-card">
          {purchases.length === 0 ? (
            <EmptyState
              icon={<Receipt />}
              title="No purchases yet"
              description="Completed purchases and their invoices will show up here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question Bank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Final Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.questionBank.title}</TableCell>
                    <TableCell>
                      {p.user.name}
                      <div className="text-muted-foreground text-xs">{p.user.email}</div>
                    </TableCell>
                    <TableCell>{formatRupees(p.basePriceSnapshot)}</TableCell>
                    <TableCell>{p.couponCodeSnapshot ?? "—"}</TableCell>
                    <TableCell>{p.discountAmount > 0 ? formatRupees(p.discountAmount) : "—"}</TableCell>
                    <TableCell className="font-semibold">{formatRupees(p.amount)}</TableCell>
                    <TableCell className="capitalize">{p.paymentProvider}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusBadge[p.status]}
                        {p.heldForReview && (
                          <span
                            title={p.failureReason ?? "Held for review"}
                            className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] text-warning"
                          >
                            <AlertTriangle className="h-3 w-3" /> Held
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      {p.invoice ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          render={
                            <a
                              href={`/api/v1/files/invoice/${p.invoice.id}`}
                              className="gap-1.5"
                            >
                              <Receipt className="h-3.5 w-3.5" /> {p.invoice.invoiceNumber}
                            </a>
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {p.status === "PENDING" && <RecheckPaymentButton purchaseId={p.id} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Reveal>
    </div>
  );
}
