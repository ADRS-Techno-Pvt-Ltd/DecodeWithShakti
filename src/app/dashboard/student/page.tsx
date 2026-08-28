import Link from "next/link";
import { BookOpen, Download, Receipt } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/landing/reveal";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const statusBadge: Record<string, React.ReactNode> = {
  SUCCESS: <StatusBadge tone="success">Success</StatusBadge>,
  PENDING: <StatusBadge tone="warning">Pending</StatusBadge>,
  FAILED: <StatusBadge tone="destructive">Failed</StatusBadge>,
  CANCELLED: <StatusBadge tone="muted">Cancelled</StatusBadge>,
  EXPIRED: <StatusBadge tone="muted">Expired</StatusBadge>,
  REFUNDED: <StatusBadge tone="muted">Refunded</StatusBadge>,
};

export default async function StudentOverviewPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, purchases, ownedAgg, pendingCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.purchase.findMany({
      where: { userId },
      include: { questionBank: true, invoice: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.purchase.aggregate({
      where: { userId, status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.purchase.count({ where: { userId, status: "PENDING" } }),
  ]);

  const stats = [
    { label: "Question Banks Owned", value: String(ownedAgg._count) },
    { label: "Total Spent", value: formatRupees(ownedAgg._sum.amount ?? 0) },
    { label: "Pending Payments", value: String(pendingCount) },
    {
      label: "Member Since",
      value: user.createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      suppressHydrationWarning: true,
    },
  ];

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="mb-4 sm:mb-6">
        <h1 className="font-heading text-xl sm:text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
        </p>
      </div>

      <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 60}>
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="text-muted-foreground text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{s.label}</div>
                <div 
                  className="font-heading mt-1 sm:mt-1.5 text-xl sm:text-2xl font-bold"
                  suppressHydrationWarning={s.suppressHydrationWarning}
                >
                  {s.value}
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={260} className="mt-6 sm:mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-base sm:text-lg font-semibold">Recent Purchases</h2>
          {purchases.length > 0 && (
            <Link
              href="/dashboard/student/purchases"
              className="text-xs sm:text-sm font-medium text-primary hover:underline whitespace-nowrap"
            >
              View all →
            </Link>
          )}
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          {purchases.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title="No purchases yet"
              description="Question banks you buy will appear here, ready to download."
              action={<Button render={<Link href="/question-banks">Browse Question Banks</Link>} />}
            />
          ) : (
            <div className="overflow-x-auto">
              <ul className="divide-y">
                {purchases.map((p) => (
                  <li key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold line-clamp-2 sm:truncate">{p.questionBank.title}</div>
                      <div className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                        {new Date(p.createdAt).toLocaleDateString("en-IN")} · {formatRupees(p.amount)}
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:shrink-0 items-center gap-2 sm:gap-3">
                      {statusBadge[p.status]}
                      {p.status === "SUCCESS" && (
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            render={
                              <a href={`/api/v1/files/download/${p.id}`} className="gap-1.5">
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Download</span>
                              </a>
                            }
                          />
                          {p.invoice && (
                            <Button
                              variant="ghost"
                              size="sm"
                              render={
                                <a href={`/api/v1/files/invoice/${p.invoice.id}`} className="gap-1.5">
                                  <Receipt className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Invoice</span>
                                </a>
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
