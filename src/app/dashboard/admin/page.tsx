import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminOverviewPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [revenueAgg, publishedCount, unpublishedCount, activeCouponCount, purchaseCount30d] =
    await Promise.all([
      prisma.purchase.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
      prisma.questionBank.count({ where: { isPublished: true } }),
      prisma.questionBank.count({ where: { isPublished: false } }),
      prisma.coupon.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
      prisma.purchase.count({
        where: { status: "SUCCESS", createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

  const stats = [
    { label: "Total Revenue", value: formatRupees(revenueAgg._sum.amount ?? 0) },
    { label: "Purchases (30d)", value: String(purchaseCount30d) },
    { label: "Active Coupons", value: String(activeCouponCount) },
    { label: "Published Banks", value: `${publishedCount} (${unpublishedCount} draft)` },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Overview</h1>
      <p className="text-muted-foreground text-sm">CA ExamBank admin dashboard.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="text-muted-foreground text-xs font-semibold">{s.label}</div>
              <div className="font-heading mt-1.5 text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
