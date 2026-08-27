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
    },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Overview</h1>
      <p className="text-muted-foreground text-sm">
        Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 60}>
            <Card>
              <CardContent className="p-5">
                <div className="text-muted-foreground text-xs font-semibold">{s.label}</div>
                <div className="font-heading mt-1.5 text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={260} className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent Purchases</h2>
          {purchases.length > 0 && (
            <Link
              href="/dashboard/student/purchases"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          {purchases.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title="No purchases yet"
              description="Question banks you buy will appear here, ready to download."
              action={<Button render={<Link href="/question-banks">Browse Question Banks</Link>} />}
            />
          ) : (
            <ul className="divide-y">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.questionBank.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("en-IN")} · {formatRupees(p.amount)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {statusBadge[p.status]}
                    {p.status === "SUCCESS" && (
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <a href={`/api/v1/files/download/${p.id}`} className="gap-1.5">
                              <Download className="h-3.5 w-3.5" />
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
          )}
        </div>
      </Reveal>
    </div>
  );
}
