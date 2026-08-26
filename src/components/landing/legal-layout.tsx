import Link from "next/link";

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
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-7 py-4">
          <Link href="/" className="font-heading flex items-center gap-2.5 text-[19px] font-semibold">
            <span className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-gradient-to-br from-primary-light to-primary-dark text-[15px] font-bold text-white">
              D
            </span>
            Decode with Shakti
          </Link>
          <Link href="/" className="text-[14.5px] font-medium text-muted-foreground hover:text-primary">
            Back to home
          </Link>
        </div>
      </header>

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
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-7 text-[13px] text-muted-foreground/80">
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
