import Link from "next/link";
import { Mail, Clock, HelpCircle, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ContactForm } from "./contact-form";

export const metadata = {
  title: "Contact us — Decode with Shakti",
};

/** Dotted-paper backdrop, matched to the checkout + catalog screens. */
const paperBg: React.CSSProperties = {
  backgroundImage: "radial-gradient(var(--border) 0.7px, transparent 0.7px)",
  backgroundSize: "24px 24px",
};

const folders = [
  {
    tab: "Orders",
    icon: Mail,
    title: "Orders & accounts",
    body: "Payment issues, invoices, downloads, or anything tied to your account — send it through the form and we'll sort it out.",
  },
  {
    tab: "Timing",
    icon: Clock,
    title: "Response time",
    body: "We typically reply within 1–2 business days, straight to the email address you write in from.",
  },
  {
    tab: "FAQ",
    icon: HelpCircle,
    title: "Before you write in",
    body: "Quick questions about previews, early-bird pricing, or coupon codes are usually answered already in the FAQ.",
    link: { href: "/#faq", label: "Browse the FAQ" },
  },
];

const tilt = ["", "-rotate-[0.8deg]", "rotate-[0.6deg]"];

export default function ContactPage() {
  const now = new Date();
  const stampDate = now
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <div className="min-h-full" style={paperBg}>
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1080px] px-7 py-16 md:py-20">
        <span className="inline-block rounded-[5px] border border-accent bg-accent px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
          Contact
        </span>
        <h1 className="font-heading mt-5 max-w-[20ch] text-[clamp(2.1rem,5.4vw,3.15rem)] leading-[1.06] font-medium tracking-tight text-balance">
          Ask your question. We&rsquo;ll file a reply.
        </h1>
        <p className="mt-4 max-w-[46ch] text-[16.5px] leading-relaxed text-muted-foreground">
          Questions about a question bank, a payment, or your account — drop them in the card and a
          real person on the team writes back, usually within a day.
        </p>

        <div className="mt-12 grid grid-cols-1 items-start gap-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-11">
          <div className="flex flex-col gap-7 pt-4">
            {folders.map((f, i) => (
              <div
                key={f.tab}
                className={`group relative rounded-[3px_12px_12px_12px] border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-light/40 hover:shadow-[0_16px_30px_-20px_rgba(37,31,115,0.42)] hover:rotate-0 ${tilt[i]}`}
              >
                <span className="absolute -top-[15px] left-[18px] rounded-t-[6px] border border-b-0 border-border bg-card px-2.5 py-[3px] font-mono text-[10px] tracking-[0.14em] text-primary uppercase transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                  {f.tab}
                </span>
                <div className="mb-1.5 flex items-center gap-2.5">
                  <f.icon className="h-[17px] w-[17px] shrink-0 text-primary" strokeWidth={1.6} />
                  <h2 className="font-heading text-[16.5px] font-medium tracking-tight">{f.title}</h2>
                </div>
                <p className="text-[13.5px] leading-[1.58] text-muted-foreground">{f.body}</p>
                {f.link && (
                  <Link
                    href={f.link.href}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
                  >
                    {f.link.label}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}

            <p className="border-l-2 border-accent pl-4 text-[12.5px] leading-[1.55] text-muted-foreground">
              Every message lands in a shared inbox the team reads through each morning — nothing
              routes to a bot.
            </p>
          </div>

          <ContactForm stampDate={stampDate} />
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-3 px-7 text-[13px] text-muted-foreground/80">
          <span>© {now.getFullYear()} Decode with Shakti. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
