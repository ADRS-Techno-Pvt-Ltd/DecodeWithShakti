import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />

      <main className="py-16">
        <div className="mx-auto max-w-3xl px-7">
          <h1 className="font-heading text-[2.1rem] leading-tight font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2.5 text-sm text-muted-foreground">Last updated: {updated}</p>

          <div className="prose-legal mt-10 flex flex-col gap-8">{children}</div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-7 text-[13px] text-muted-foreground/80 2xl:max-w-[1440px]">
          <span>© {new Date().getFullYear()} Decode with Shakti. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="mt-2.5 flex flex-col gap-3 text-[14.5px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
