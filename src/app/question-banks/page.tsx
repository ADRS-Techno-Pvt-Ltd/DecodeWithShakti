import Link from "next/link";
import { SearchX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePrice } from "@/lib/pricing";
import { thumbnailUrlFor } from "@/lib/thumbnail";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { QuestionBankCard } from "@/features/question-banks/question-bank-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProductTypeFilter } from "./product-type-filter";

const filterPillClass =
  "rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors";
const filterPillActive = "border-primary bg-primary text-primary-foreground shadow-sm";
const filterPillInactive =
  "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground";

const TYPE_MAP = {
  question_bank: "QUESTION_BANK",
  test_series: "TEST_SERIES",
  mentorship: "MENTORSHIP",
} as const;

type TypeFilter = keyof typeof TYPE_MAP;

const HEADINGS: Record<TypeFilter | "all", { title: string; noun: string }> = {
  all: { title: "Browse Question Banks", noun: "product" },
  question_bank: { title: "Browse Question Banks", noun: "question bank" },
  test_series: { title: "Browse Test Series", noun: "test series" },
  mentorship: { title: "Browse Mentorship", noun: "mentorship" },
};

export default async function QuestionBankCatalogPage({
  searchParams,
}: PageProps<"/question-banks">) {
  const { category, type } = await searchParams;
  const categorySlug = typeof category === "string" ? category : undefined;
  const typeFilter: TypeFilter | undefined =
    type === "question_bank" || type === "test_series" || type === "mentorship" ? type : undefined;

  const [banks, categories] = await Promise.all([
    prisma.questionBank.findMany({
      where: {
        isPublished: true,
        // startsWith (not exact) so a level prefix like "ca-inter" matches every
        // Inter subject category (ca-inter-costing/taxation/accounts) — the
        // footer's per-level links use this; the per-category pills below still
        // pass a full exact slug, which only ever matches itself.
        ...(categorySlug ? { category: { slug: { startsWith: categorySlug } } } : {}),
        ...(typeFilter ? { type: TYPE_MAP[typeFilter] } : {}),
      },
      include: { category: true, subject: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const heading = HEADINGS[typeFilter ?? "all"];
  const count = banks.length;
  const countNoun =
    typeFilter === "test_series"
      ? `test series`
      : `${heading.noun}${count === 1 ? "" : "s"}`;

  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-7 py-10 2xl:max-w-[1440px]">
      <h1 className="font-heading text-3xl font-bold">{heading.title}</h1>
      <p className="mt-1 text-muted-foreground">
        {count} {countNoun} available right now.
      </p>

      <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
            Filter by category
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={typeFilter ? `/question-banks?type=${typeFilter}` : "/question-banks"}
              className={cn(filterPillClass, !categorySlug ? filterPillActive : filterPillInactive)}
            >
              All Categories
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={
                  typeFilter
                    ? `/question-banks?category=${c.slug}&type=${typeFilter}`
                    : `/question-banks?category=${c.slug}`
                }
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

        <div className="shrink-0">
          <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
            Filter by type
          </p>
          <ProductTypeFilter value={typeFilter ?? "all"} />
        </div>
      </div>

      {count === 0 ? (
        <EmptyState
          className="mt-12"
          icon={<SearchX />}
          title={`No ${typeFilter === "test_series" ? "test series" : heading.noun + "s"} found`}
          description="Nothing matches these filters yet — check back soon or try another category or type."
        />
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
                subjectName={bank.subject?.name ?? null}
                price={bank.price}
                effectivePrice={effectivePrice}
                previewEnabled={bank.previewEnabled}
                thumbnailUrl={thumbnailUrlFor(bank.thumbnailPath)}
                type={bank.type}
              />
            );
          })}
        </div>
      )}
      </div>
    </>
  );
}
