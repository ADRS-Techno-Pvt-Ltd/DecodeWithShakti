import Link from "next/link";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const dashedLine = {
  backgroundImage:
    "repeating-linear-gradient(90deg, var(--border) 0 10px, transparent 10px 14px)",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center sm:py-28">
        {/* rotated "stamp" badge */}
        <div className="relative mb-9 flex h-[168px] w-[168px] rotate-[-9deg] items-center justify-center rounded-full border-2 border-primary-light bg-card">
          <div className="absolute inset-[9px] rounded-full border-[1.5px] border-dashed border-primary-light" />
          <div className="flex flex-col items-center">
            <span className="font-heading text-[46px] leading-none font-semibold text-primary-light">
              404
            </span>
            <span className="mt-1.5 font-mono text-[10.5px] tracking-[0.12em] text-primary uppercase">
              page not found
            </span>
          </div>
        </div>

        <h1 className="font-heading max-w-[560px] text-3xl font-medium tracking-tight sm:text-[42px]">
          We couldn&apos;t find that page.
        </h1>
        <p className="mt-4 max-w-[440px] text-[15.5px] leading-relaxed text-muted-foreground">
          The link may be broken, or the page may have moved. Nothing to worry about — head back
          home or check the FAQ for quick answers.
        </p>

        {/* empty index card */}
        <div className="relative mt-11 mb-11 w-full max-w-[420px] rounded-tl-[2px] rounded-tr-[14px] rounded-b-[14px] border border-border bg-card px-7 py-7">
          <span className="absolute -top-[17px] left-6 rounded-t-[7px] border border-b-0 border-border bg-card px-2.5 py-[3px] font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
            Nothing here
          </span>
          <div className="mb-3.5 h-[11px] rounded-[3px]" style={dashedLine} />
          <div className="mb-3.5 h-[11px] w-[78%] rounded-[3px]" style={dashedLine} />
          <div className="mb-3.5 h-[11px] w-[92%] rounded-[3px]" style={dashedLine} />
          <div className="h-[11px] w-[55%] rounded-[3px]" style={dashedLine} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-light px-5.5 py-3 text-[14.5px] font-medium text-white transition-colors hover:bg-primary"
          >
            Back to home →
          </Link>
          <Link
            href="/#faq"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary-light/40 bg-accent px-4.5 py-2.5 text-sm font-medium text-primary-dark transition-colors hover:bg-primary/10"
          >
            <Search className="h-3.5 w-3.5" />
            Browse the FAQ
          </Link>
        </div>
      </main>
    </div>
  );
}
