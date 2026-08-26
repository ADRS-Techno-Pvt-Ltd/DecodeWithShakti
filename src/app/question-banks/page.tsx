import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePrice } from "@/lib/pricing";
import { thumbnailUrlFor } from "@/lib/thumbnail";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QuestionBankCard } from "@/features/question-banks/question-bank-card";

const filterPillClass =
  "rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors";
const filterPillActive = "border-primary bg-primary text-primary-foreground shadow-sm";
const filterPillInactive =
  "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground";

export default async function QuestionBankCatalogPage({
  searchParams,
}: PageProps<"/question-banks">) {
  const { category } = await searchParams;
  const categorySlug = typeof category === "string" ? category : undefined;

  const [session, banks, categories] = await Promise.all([
    auth(),
    prisma.questionBank.findMany({
      where: {
        isPublished: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const dashboardHref = session?.user?.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student";

  return (
    <div className="mx-auto w-full max-w-6xl px-7 py-10 2xl:max-w-[1440px]">
      <nav className="mb-8 flex items-center justify-between">
        <Link href="/" className="font-heading flex items-center gap-2.5 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-primary-dark text-xs font-bold text-white">
            D
          </span>
          Decode with Shakti
        </Link>
        {session?.user ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={dashboardHref}>{session.user.name ?? "Dashboard"}</Link>}
          />
        ) : (
          <Button variant="ghost" size="sm" render={<Link href="/login">Log in</Link>} />
        )}
      </nav>

      <h1 className="font-heading text-3xl font-bold">Browse Question Banks</h1>
      <p className="mt-1 text-muted-foreground">
        {banks.length} question bank{banks.length === 1 ? "" : "s"} available right now.
      </p>

      <div className="mt-7">
        <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
          Filter by category
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/question-banks"
            className={cn(filterPillClass, !categorySlug ? filterPillActive : filterPillInactive)}
          >
            All Categories
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/question-banks?category=${c.slug}`}
              className={cn(
                filterPillClass,
                categorySlug === c.slug ? filterPillActive : filterPillInactive,
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {banks.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          No question banks found in this category yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => {
            const effectivePrice = resolveEffectivePrice(bank);
            return (
              <QuestionBankCard
                key={bank.id}
                slug={bank.slug}
                title={bank.title}
                description={bank.description}
                categoryName={bank.category.name}
                price={bank.price}
                effectivePrice={effectivePrice}
                previewEnabled={bank.previewEnabled}
                thumbnailUrl={thumbnailUrlFor(bank.id, bank.thumbnailPath, bank.updatedAt)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
