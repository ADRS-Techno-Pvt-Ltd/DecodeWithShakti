import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveEffectivePrice } from "@/lib/pricing";
import { thumbnailUrlFor } from "@/lib/thumbnail";
import { Reveal } from "@/components/landing/reveal";
import { SiteHeader } from "@/components/site-header";
import { PurchaseCard } from "./purchase-card";

/** Dotted-paper backdrop, matched to the checkout mockup. */
const paperBg: React.CSSProperties = {
  backgroundImage: "radial-gradient(var(--border) 0.7px, transparent 0.7px)",
  backgroundSize: "22px 22px",
};

function Folder({
  tab,
  className = "",
  children,
}: {
  tab: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative rounded-[2px_14px_14px_14px] border border-border bg-card px-7 pt-7 pb-7 ${className}`}
    >
      <span className="absolute -top-[17px] left-6 rounded-t-[7px] border border-b-0 border-border bg-card px-2.5 py-[3px] font-mono text-[11px] tracking-[0.06em] text-primary-light uppercase">
        {tab}
      </span>
      {children}
    </div>
  );
}

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
  const thumbnailUrl = thumbnailUrlFor(bank.thumbnailPath);

  return (
    <div className="min-h-full" style={paperBg}>
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-7 py-14 2xl:max-w-[1440px]">
        <Link
          href="/question-banks"
          className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>
        <div className="mb-7">
          <span className="inline-block rounded-[5px] border border-primary/25 bg-accent px-3 py-1.5 font-mono text-[11.5px] tracking-[0.11em] text-primary-dark uppercase">
            {bank.category.name} · Question bank
          </span>
        </div>

        <div className="grid max-w-5xl grid-cols-1 items-start gap-9 lg:grid-cols-[1fr_340px]">
          <Reveal className="flex flex-col gap-8">
            <Folder tab="Preview">
              {bank.previewEnabled ? (
                <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.05em] text-success uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Preview enabled
                </span>
              ) : (
                <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-mono text-[10.5px] tracking-[0.05em] text-muted-foreground uppercase">
                  Preview not available
                </span>
              )}

              <div className="mb-6 flex items-center justify-center rounded-[10px] border border-border bg-accent px-6 py-9">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="w-[220px] max-w-full rounded-[4px] shadow-[0_20px_34px_-18px_rgba(53,47,158,0.35)]"
                  />
                ) : (
                  <div className="flex aspect-3/4 w-[200px] items-center justify-center rounded-[4px] bg-card text-primary-light shadow-[0_20px_34px_-18px_rgba(53,47,158,0.35)]">
                    <BookOpen className="h-10 w-10" strokeWidth={1.5} />
                  </div>
                )}
              </div>

              <span className="inline-block rounded-[6px] border border-primary/25 bg-accent px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                {bank.category.name}
              </span>
              <h1 className="font-heading mt-2.5 text-[32px] leading-tight font-medium">
                {bank.title}
              </h1>
              <p className="mt-2 text-[15px] text-muted-foreground">{bank.description}</p>

              {bank.previewEnabled && (
                <a
                  href={`/api/v1/files/preview/${bank.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-3.5 py-2 text-[13.5px] font-medium text-primary hover:bg-primary/10"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview first {bank.previewPageCount} of {bank.totalPages ?? "?"} pages
                </a>
              )}
            </Folder>
          </Reveal>

          <Reveal delay={120}>
            <PurchaseCard
              questionBankId={bank.id}
              basePrice={effectivePrice}
              regularPrice={bank.price}
              earlyBirdActive={earlyBirdActive}
              alreadyOwned={alreadyOwned}
              features={bank.features}
            />
          </Reveal>
        </div>
      </main>
    </div>
  );
}
