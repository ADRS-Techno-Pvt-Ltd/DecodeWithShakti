import Link from "next/link";
import { Download, Receipt, BookOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/landing/reveal";

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

export default async function StudentPurchasesPage() {
  const session = await auth();
  const purchases = await prisma.purchase.findMany({
    where: { userId: session!.user.id },
    include: { questionBank: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });

  const successCount = purchases.filter((p) => p.status === "SUCCESS").length;

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="mb-4 sm:mb-6 flex items-start sm:items-end justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl sm:text-2xl font-bold">My Purchases</h1>
          <p className="text-sm text-muted-foreground">
            {successCount} question bank{successCount === 1 ? "" : "s"} purchased
          </p>
        </div>
        <Button 
          className="shrink-0 text-xs sm:text-sm"
          size="sm"
          render={
            <Link href="/question-banks">
              <span className="hidden md:inline">Browse More Question Banks</span>
              <span className="hidden sm:inline md:hidden">Browse Banks</span>
              <span className="sm:hidden">Browse</span>
            </Link>
          } 
        />
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card overflow-hidden">
          {purchases.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title="No purchases yet"
              description="Question banks you buy will appear here, ready to download."
              action={
                <Button render={<Link href="/question-banks">Browse Question Banks</Link>} />
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Question Bank</TableHead>
                    <TableHead className="whitespace-nowrap">Purchased On</TableHead>
                    <TableHead className="whitespace-nowrap">Amount Paid</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Files</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-semibold whitespace-nowrap">{p.questionBank.title}</div>
                      </TableCell>
                      <TableCell suppressHydrationWarning className="whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatRupees(p.amount)}</TableCell>
                      <TableCell>{statusBadge[p.status]}</TableCell>
                      <TableCell>
                        {p.status === "SUCCESS" ? (
                          <div className="flex gap-2 whitespace-nowrap">
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
                        ) : p.status === "REFUNDED" ? (
                          p.invoice ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              render={
                                <a href={`/api/v1/files/invoice/${p.invoice.id}`} className="gap-1.5">
                                  <Receipt className="h-3.5 w-3.5" /> Invoice
                                </a>
                              }
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs whitespace-nowrap">Access revoked</span>
                          )
                        ) : p.status === "FAILED" || p.status === "CANCELLED" || p.status === "EXPIRED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/question-banks/${p.questionBank.slug}`}>Buy again</Link>}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            Available after payment confirms
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
