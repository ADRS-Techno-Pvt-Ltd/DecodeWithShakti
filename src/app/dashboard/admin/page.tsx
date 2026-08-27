import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";
import { RevenueChart, type RevenuePoint } from "@/features/admin/revenue-chart";

const WINDOW_DAYS = 30;

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default async function AdminOverviewPage() {
  const windowStart = startOfDay(new Date());
  windowStart.setDate(windowStart.getDate() - (WINDOW_DAYS - 1));

  const [revenueAgg, publishedCount, unpublishedCount, activeCouponCount, windowPurchases] =
    await Promise.all([
      prisma.purchase.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
      prisma.questionBank.count({ where: { isPublished: true } }),
      prisma.questionBank.count({ where: { isPublished: false } }),
      prisma.coupon.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
      prisma.purchase.findMany({
        where: { status: "SUCCESS", createdAt: { gte: windowStart } },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  // Bucket revenue by day, then accumulate.
  const perDay = new Map<string, number>();
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = new Date(windowStart);
    day.setDate(windowStart.getDate() + i);
    perDay.set(day.toISOString().slice(0, 10), 0);
  }
  for (const p of windowPurchases) {
    const key = startOfDay(p.createdAt).toISOString().slice(0, 10);
    perDay.set(key, (perDay.get(key) ?? 0) + p.amount);
  }

  let running = 0;
  const revenueSeries: RevenuePoint[] = [...perDay.entries()].map(([key, amount]) => {
    running += amount;
    return {
      date: new Date(key).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      cumulative: running,
    };
  });

  const purchaseCount30d = windowPurchases.length;

  const stats = [
    { label: "Total Revenue", value: formatRupees(revenueAgg._sum.amount ?? 0) },
    { label: "Purchases (30d)", value: String(purchaseCount30d) },
    { label: "Active Coupons", value: String(activeCouponCount) },
    { label: "Published Banks", value: `${publishedCount} (${unpublishedCount} draft)` },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Overview</h1>
      <p className="text-muted-foreground text-sm">Decode with Shakti admin dashboard.</p>

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

      <Reveal delay={260} className="mt-4">
        <RevenueChart data={revenueSeries} />
      </Reveal>
    </div>
  );
}
