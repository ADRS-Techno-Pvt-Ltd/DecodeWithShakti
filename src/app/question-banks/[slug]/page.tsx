import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveEffectivePrice } from "@/lib/pricing";
import { thumbnailUrlFor } from "@/lib/thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PurchaseCard } from "./purchase-card";

const included = [
  "Watermarked with your account email on download",
  "Lifetime access from your student dashboard",
  "Auto-generated invoice on purchase",
];

export default async function QuestionBankDetailPage({
  params,
}: PageProps<"/question-banks/[slug]">) {
  const { slug } = await params;

  const bank = await prisma.questionBank.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!bank || !bank.isPublished) notFound();

  const session = await auth();
  const alreadyOwned = session?.user
    ? Boolean(
        await prisma.purchase.findFirst({
          where: { userId: session.user.id, questionBankId: bank.id, status: "SUCCESS" },
        }),
      )
    : false;

  const effectivePrice = resolveEffectivePrice(bank);
  const earlyBirdActive = effectivePrice < bank.price;
  const thumbnailUrl = thumbnailUrlFor(bank.id, bank.thumbnailPath, bank.updatedAt);

  return (
    <div className="mx-auto w-full max-w-6xl px-7 py-10 2xl:max-w-[1440px]">
      <nav className="mb-8">
        <Link
          href="/question-banks"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Link>
      </nav>

      <Badge variant="secondary">{bank.category.name}</Badge>
      <h1 className="font-heading mt-2.5 text-2xl font-bold md:text-3xl">{bank.title}</h1>
      <p className="mt-2.5 max-w-2xl text-muted-foreground">{bank.description}</p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">
                {bank.previewEnabled ? "Preview" : "Preview not available"}
              </CardTitle>
              {bank.previewEnabled && <StatusBadge tone="success">Preview enabled</StatusBadge>}
            </CardHeader>
            <CardContent>
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border bg-muted text-primary">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <BookOpen className="h-10 w-10" strokeWidth={1.5} />
                )}
              </div>
              {bank.previewEnabled && (
                <Button
                  variant="outline"
                  className="mt-4"
                  render={
                    <a href={`/api/v1/files/preview/${bank.id}`} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                      Preview first {bank.previewPageCount} of {bank.totalPages ?? "?"} pages
                    </a>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card className="mt-5">
            <CardHeader>
              <CardTitle className="text-base">What&apos;s included</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 text-sm">
              <p className="text-muted-foreground">{bank.description}</p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                {bank.totalPages ?? "—"}-page downloadable PDF
              </div>
              {included.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={120}>
          <PurchaseCard
            questionBankId={bank.id}
            basePrice={effectivePrice}
            regularPrice={bank.price}
            earlyBirdActive={earlyBirdActive}
            alreadyOwned={alreadyOwned}
          />
        </Reveal>
      </div>
    </div>
  );
}
