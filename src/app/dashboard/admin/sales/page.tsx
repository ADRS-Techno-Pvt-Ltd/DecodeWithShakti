import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

const statusBadge: Record<string, React.ReactNode> = {
  SUCCESS: <Badge className="border-green-200 bg-green-50 text-green-700">Success</Badge>,
  PENDING: <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>,
  FAILED: <Badge className="border-red-200 bg-red-50 text-red-700">Failed</Badge>,
};

export default async function AdminSalesPage() {
  const purchases = await prisma.purchase.findMany({
    include: { user: true, questionBank: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Sales</h1>
      <p className="text-muted-foreground text-sm">{purchases.length} purchases (most recent 200).</p>

      <div className="mt-6 rounded-lg border bg-white">
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
