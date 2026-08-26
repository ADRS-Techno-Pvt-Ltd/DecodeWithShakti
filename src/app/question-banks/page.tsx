import Link from "next/link";
import { BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePrice } from "@/lib/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

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
        <Link href="/" className="font-heading flex items-center gap-2 font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            EB
          </span>
          CA ExamBank
        </Link>
        <Button variant="ghost" size="sm" render={<Link href="/login">Log in</Link>} />
      </nav>

      <h1 className="font-heading text-3xl font-bold">Browse CA Question Banks</h1>
      <p className="text-muted-foreground mt-1">
        {banks.length} question bank{banks.length === 1 ? "" : "s"} across CA Foundation, Inter
        and Final.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/question-banks">
          <Badge variant={!categorySlug ? "default" : "secondary"}>All Levels</Badge>
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/question-banks?category=${c.slug}`}>
            <Badge variant={categorySlug === c.slug ? "default" : "secondary"}>{c.name}</Badge>
          </Link>
        ))}
      </div>

      {banks.length === 0 ? (
        <p className="text-muted-foreground mt-12 text-center">
          No question banks found in this category yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => {
            const effectivePrice = resolveEffectivePrice(bank);
            const hasEarlyBird = effectivePrice < bank.price;
            return (
              <Link key={bank.id} href={`/question-banks/${bank.slug}`}>
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex h-20 items-center justify-center rounded-md bg-slate-900 text-slate-100">
                      <BookOpen className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <Badge variant="secondary">{bank.category.name}</Badge>
                    <h3 className="font-heading mt-2.5 font-semibold">{bank.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {bank.description}
                    </p>
                    <div className="mt-3 flex items-baseline gap-2">
                      {hasEarlyBird && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatRupees(bank.price)}
                        </span>
                      )}
                      <span className="text-lg font-bold">{formatRupees(effectivePrice)}</span>
                    </div>
                    {bank.previewEnabled ? (
                      <Badge className="mt-2 border-green-200 bg-green-50 text-green-700">
                        Preview available
                      </Badge>
                    ) : hasEarlyBird ? (
                      <Badge className="mt-2 border-amber-200 bg-amber-50 text-amber-700">
                        Early bird
                      </Badge>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
