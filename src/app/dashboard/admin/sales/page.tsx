import { Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Reveal } from "@/components/landing/reveal";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

const statusBadge: Record<string, React.ReactNode> = {
  SUCCESS: <StatusBadge tone="success">Success</StatusBadge>,
  PENDING: <StatusBadge tone="warning">Pending</StatusBadge>,
  FAILED: <StatusBadge tone="destructive">Failed</StatusBadge>,
};

export default async function AdminSalesPage() {
  const purchases = await prisma.purchase.findMany({
    include: { user: true, questionBank: true, invoice: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Sales</h1>
      <p className="text-muted-foreground text-sm">{purchases.length} purchases (most recent 200).</p>

      <Reveal delay={60}>
        <div className="mt-6 rounded-lg border bg-card">
          {purchases.length === 0 ? (
            <p className="text-muted-foreground p-8 text-center text-sm">No purchases yet.</p>
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
                    <TableCell>{statusBadge[p.status]}</TableCell>
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
