import Link from "next/link";
import { SearchX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { thumbnailUrlFor } from "@/lib/thumbnail";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { FreeResourceCard } from "@/features/free-resources/free-resource-card";
import { EmptyState } from "@/components/dashboard/empty-state";

const filterPillClass =
  "rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors";
const filterPillActive = "border-primary bg-primary text-primary-foreground shadow-sm";
const filterPillInactive =
  "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground";

export default async function FreeResourcesPage({
  searchParams,
}: PageProps<"/free-resources">) {
  const { category } = await searchParams;
  const categorySlug = typeof category === "string" ? category : undefined;

  const [resources, categories] = await Promise.all([
    prisma.freeResource.findMany({
      where: {
        isPublished: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      include: { category: true, subject: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { slug: { not: { startsWith: "ca-final" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const count = resources.length;

  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-7 py-10 2xl:max-w-[1440px]">
        <h1 className="font-heading text-3xl font-bold">Free Resources</h1>
        <p className="mt-1 text-muted-foreground">
          {count} free {count === 1 ? "resource" : "resources"} available to download right now.
        </p>

        <div className="mt-7">
          <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
            Filter by category
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/free-resources"
              className={cn(filterPillClass, !categorySlug ? filterPillActive : filterPillInactive)}
            >
              All Categories
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/free-resources?category=${c.slug}`}
                className={cn(filterPillClass, categorySlug === c.slug ? filterPillActive : filterPillInactive)}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        {count === 0 ? (
          <EmptyState
            className="mt-12"
            icon={<SearchX />}
            title="No free resources found"
            description="Nothing matches this filter yet — check back soon or browse all categories."
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <FreeResourceCard
                key={resource.id}
                id={resource.id}
                title={resource.title}
                description={resource.description}
                categoryName={resource.category?.name ?? null}
                subjectName={resource.subject?.name ?? null}
                thumbnailUrl={thumbnailUrlFor(resource.thumbnailPath)}
                hasAnswerKey={resource.answerKeyFilePath != null}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
