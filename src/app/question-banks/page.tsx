import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePrice } from "@/lib/pricing";
import { thumbnailUrlFor } from "@/lib/thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuestionBankCard } from "@/features/question-banks/question-bank-card";

export default async function QuestionBankCatalogPage({
  searchParams,
}: PageProps<"/question-banks">) {
  const { category } = await searchParams;
  const categorySlug = typeof category === "string" ? category : undefined;

  const [banks, categories] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-8 flex items-center justify-between">
        <Link href="/" className="font-heading flex items-center gap-2.5 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-primary-dark text-xs font-bold text-white">
            D
          </span>
          Decode with Shakti
        </Link>
        <Button variant="ghost" size="sm" render={<Link href="/login">Log in</Link>} />
      </nav>

      <h1 className="font-heading text-3xl font-bold">Browse Question Banks</h1>
      <p className="mt-1 text-muted-foreground">
        {banks.length} question bank{banks.length === 1 ? "" : "s"} available right now.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/question-banks">
          <Badge variant={!categorySlug ? "default" : "secondary"}>All Categories</Badge>
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/question-banks?category=${c.slug}`}>
            <Badge variant={categorySlug === c.slug ? "default" : "secondary"}>{c.name}</Badge>
          </Link>
        ))}
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
                thumbnailUrl={thumbnailUrlFor(bank.id, bank.thumbnailPath)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
