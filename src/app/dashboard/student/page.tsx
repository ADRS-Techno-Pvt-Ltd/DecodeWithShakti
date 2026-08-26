import Link from "next/link";
import { Download, Receipt } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

const statusBadge: Record<string, React.ReactNode> = {
  SUCCESS: <Badge className="border-green-200 bg-green-50 text-green-700">Success</Badge>,
  PENDING: <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>,
  FAILED: <Badge className="border-red-200 bg-red-50 text-red-700">Failed</Badge>,
};

export default async function StudentDashboardPage() {
  const session = await auth();
  const purchases = await prisma.purchase.findMany({
    where: { userId: session!.user.id },
    include: { questionBank: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });

  const successCount = purchases.filter((p) => p.status === "SUCCESS").length;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">My Purchases</h1>
          <p className="text-sm text-muted-foreground">
            {successCount} question bank{successCount === 1 ? "" : "s"} purchased
          </p>
        </div>
        <Button render={<Link href="/question-banks">Browse More Question Banks</Link>} />
      </div>

      <div className="rounded-lg border bg-white">
        {purchases.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">
            You haven&apos;t purchased any question banks yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question Bank</TableHead>
                <TableHead>Purchased On</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Files</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-semibold">{p.questionBank.title}</div>
                  </TableCell>
                  <TableCell>{new Date(p.createdAt).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>{formatRupees(p.amount)}</TableCell>
                  <TableCell>{statusBadge[p.status]}</TableCell>
                  <TableCell>
                    {p.status === "SUCCESS" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <a href={`/api/v1/files/download/${p.id}`} className="gap-1.5">
                              <Download className="h-3.5 w-3.5" /> Download
                            </a>
                          }
                        />
                        {p.invoice && (
                          <Button
                            variant="ghost"
                            size="sm"
                            render={
                              <a
                                href={`/api/v1/files/invoice/${p.invoice.id}`}
                                className="gap-1.5"
                              >
                                <Receipt className="h-3.5 w-3.5" /> Invoice
                              </a>
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Available after payment confirms
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
