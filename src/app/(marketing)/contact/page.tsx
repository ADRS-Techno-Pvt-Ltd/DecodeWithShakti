import Link from "next/link";
import { Mail, Clock, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "./contact-form";

export const metadata = {
  title: "Contact us — Decode with Shakti",
};

const infoPoints = [
  {
    icon: Mail,
    title: "Orders & accounts",
    body: "Payment issues, invoices, downloads, or anything about your account — send it through the form and we'll sort it out.",
  },
  {
    icon: Clock,
    title: "Response time",
    body: "We typically reply within 1–2 business days, straight to the email you write in from.",
  },
  {
    icon: HelpCircle,
    title: "Before you write in",
    body: "Quick questions about previews, early-bird pricing, or coupons are usually answered in the FAQ.",
    link: { href: "/#faq", label: "Browse the FAQ" },
  },
];

export default function ContactPage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-7 py-4 2xl:max-w-[1440px]">
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
        <div className="mx-auto max-w-5xl px-7 2xl:max-w-[1280px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide text-primary uppercase">
            Contact
          </span>
          <h1 className="font-heading mt-3.5 text-[2.1rem] leading-tight font-semibold tracking-tight md:text-[2.4rem]">
            Get in touch
          </h1>
          <p className="mt-2.5 max-w-lg text-muted-foreground">
            Questions about a question bank, a payment, or your account? Send us a message below
            and a real person will get back to you.
          </p>

          <div className="mt-11 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.35fr]">
            <div className="flex flex-col gap-7">
              {infoPoints.map((p) => (
                <div key={p.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <p.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{p.title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                      {p.body}
                    </p>
                    {p.link && (
                      <Link
                        href={p.link.href}
                        className="mt-1.5 inline-block text-[13.5px] font-medium text-primary hover:underline"
                      >
                        {p.link.label} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <ContactForm />
              </CardContent>
            </Card>
          </div>
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
