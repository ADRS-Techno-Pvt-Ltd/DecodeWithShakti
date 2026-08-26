"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, type Variants } from "motion/react";
import {
  ArrowRight,
  Eye,
  Clock,
  DownloadCloud,
  ShieldCheck,
  Receipt,
  ListChecks,
  CheckCircle2,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MentorSection } from "@/components/landing/mentor-section";
import { Reveal } from "@/components/landing/reveal";

const examPills = ["CA", "CS", "CMA", "Banking", "SSC", "Railways", "UPSC", "State PSC"];

const features = [
  {
    icon: Eye,
    title: "Preview before you pay",
    body: "Every bank opens with a free sample of real pages, so you know the difficulty and format before you spend a rupee.",
  },
  {
    icon: Clock,
    title: "Early-bird pricing",
    body: "New banks launch at a discount with a visible deadline. Buy early, pay less — the price reverts automatically after.",
  },
  {
    icon: DownloadCloud,
    title: "Instant, unlimited download",
    body: "The moment payment clears, your file unlocks on your dashboard — download it again any time, no re-purchase needed.",
  },
  {
    icon: ShieldCheck,
    title: "Your copy, protected",
    body: "Each download carries a quiet watermark of your registered email — the file is yours alone, on every page.",
  },
  {
    icon: Receipt,
    title: "An invoice for every order",
    body: "A proper receipt is generated automatically the moment your purchase succeeds — handy for reimbursements and records.",
  },
  {
    icon: ListChecks,
    title: "Organized by exam",
    body: "Every bank sits under its exam and paper, so you can find exactly what you're revising without scrolling past the rest.",
  },
];

const steps = [
  { title: "Find your paper", body: "Filter by exam and category to land on the exact bank you need." },
  { title: "Preview a sample", body: "Open a few real pages to check the pattern and difficulty first." },
  { title: "Pay securely", body: "Apply a coupon if you have one, then complete checkout in seconds." },
  { title: "Download & practice", body: "Your file and invoice land on your dashboard immediately." },
];

// Static, curated examples for the landing page — not live catalog data.
// Swap for the current promotions when they change; the real, always-current
// inventory lives at /question-banks.
const featuredBanks = [
  {
    category: "CA Foundation · Paper 2",
    title: "Business Laws — 600 Question Bank",
    desc: "MCQs and short-answer questions across all 5 chapters, sorted by weightage.",
    oldPrice: "₹899",
    price: "₹649",
    badge: { label: "Early bird · ends in 2 days", tone: "gold" as const },
    bullets: ["12-page free preview", "600 questions, answer key included", "Instant download after purchase"],
    popular: false,
  },
  {
    category: "SSC CGL · Tier I",
    title: "Quantitative Aptitude — 900 Question Bank",
    desc: "Topic-wise sets plus 5 full-length mock papers with detailed solutions.",
    oldPrice: null,
    price: "₹549",
    badge: { label: "Regular price", tone: "green" as const },
    bullets: ["15-page free preview", "5 full-length mock papers", "Instant download after purchase"],
    popular: true,
  },
  {
    category: "CS Executive · Module I",
    title: "Company Law — 480 Question Bank",
    desc: "Case-study based questions in the exact ICSI pattern, updated for the current syllabus.",
    oldPrice: "₹749",
    price: "₹579",
    badge: { label: "Early bird · ends in 5 days", tone: "gold" as const },
    bullets: ["10-page free preview", "480 case-study questions", "Instant download after purchase"],
    popular: false,
  },
];

const testimonials = [
  {
    quote:
      "The preview sold me — I could see the questions matched the real exam pattern before I paid. Cleared CA Foundation in my first attempt.",
    name: "Rahul Kulkarni",
    exam: "CA Foundation, May 2026",
    color: "bg-primary-light",
  },
  {
    quote:
      "Grabbed the SSC quant bank during the early-bird window and it paid for itself in one mock score jump. Straightforward checkout, instant download.",
    name: "Anjali Sharma",
    exam: "SSC CGL, 2026",
    color: "bg-gold",
  },
  {
    quote:
      "No bundled courses I'd never touch — just the Company Law bank I actually needed, priced fairly, with an invoice for my study budget.",
    name: "Priya Menon",
    exam: "CS Executive, 2026",
    color: "bg-success",
  },
];

const faqs = [
  {
    q: "What exactly do I get after buying a question bank?",
    a: "A downloadable PDF of the full question bank, watermarked with your registered email, plus an auto-generated invoice for the purchase. Both stay available on your student dashboard for future downloads.",
  },
  {
    q: "How does early-bird pricing work?",
    a: "Select banks launch with a discounted price and a visible deadline. Buy before it passes and you're charged the discounted amount automatically — after that, the price reverts to regular with no action needed from you.",
  },
  {
    q: "Can I preview a bank before paying?",
    a: "Yes — every bank with preview enabled shows a set number of real pages for free, so you can judge difficulty and format before you buy. The full file only unlocks after a successful purchase.",
  },
  {
    q: "Why is my download watermarked with my email?",
    a: "It's a light, diagonal watermark on every page identifying your copy as yours — it doesn't interfere with reading or printing, and it's what lets us keep prices fair for everyone by discouraging file sharing.",
  },
  {
    q: "Do you offer coupon codes?",
    a: "Occasionally, yes. When a coupon is active you can enter it at checkout to see the discount applied before you confirm payment. Codes have an expiry date and a limited number of uses, so they may run out.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide text-accent-foreground uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_0_3px_var(--success)]/20" />
      {children}
    </span>
  );
}

/** Wraps a Button (or anything) with a subtle press/lift on hover and tap. */
function MotionButton({
  children,
  block = false,
}: {
  children: React.ReactNode;
  block?: boolean;
}) {
  return (
    <motion.div
      className={block ? "block" : "inline-block"}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.965 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const heroItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0.65, 0.3, 0.9] } },
};

export default function LandingPage() {
  const { data: session } = useSession();
  const dashboardHref = session?.user?.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1440px] items-center justify-between px-7 py-4">
          <Link href="/" className="font-heading flex items-center gap-2.5 text-[19px] font-semibold">
            <span className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-gradient-to-br from-primary-light to-primary-dark text-[15px] font-bold text-white">
              D
            </span>
            Decode with Shakti
          </Link>
          <nav className="hidden items-center gap-8 text-[14.5px] font-medium text-muted-foreground md:flex">
            <Link href="#mentor" className="hover:text-primary">Your mentor</Link>
            <Link href="#features" className="hover:text-primary">Why us</Link>
            <Link href="#how" className="hover:text-primary">How it works</Link>
            <Link href="#pricing" className="hover:text-primary">Question banks</Link>
            <Link href="#testimonials" className="hover:text-primary">Results</Link>
            <Link href="#faq" className="hover:text-primary">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2.5">
            {session?.user ? (
              <Button
                variant="ghost"
                className="h-9 px-4"
                render={<Link href={dashboardHref}>{session.user.name ?? "Dashboard"}</Link>}
              />
            ) : (
              <Button variant="ghost" className="h-9 px-4" render={<Link href="/login">Log in</Link>} />
            )}
            <Button className="h-9 px-5 shadow-sm" render={<Link href="/question-banks">Browse banks</Link>} />
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="border-b border-border bg-gradient-to-b from-[#fcfcfe] to-background py-22">
          <div className="mx-auto grid max-w-6xl 2xl:max-w-[1440px] grid-cols-1 items-center gap-14 px-7 md:grid-cols-[1.05fr_0.95fr]">
            <motion.div variants={heroContainer} initial="hidden" animate="show">
              <motion.div variants={heroItem}>
                <Eyebrow>Used by 12,400+ aspirants this season</Eyebrow>
              </motion.div>
              <motion.h1
                variants={heroItem}
                className="font-heading mt-5 text-[2.6rem] leading-[1.1] font-semibold tracking-tight text-foreground md:text-[3.4rem]"
              >
                Practice the questions that <span className="text-primary">actually show up</span> on exam day.
              </motion.h1>
              <motion.p
                variants={heroItem}
                className="mt-5 max-w-lg text-[17.5px] leading-relaxed text-muted-foreground"
              >
                Exam-pattern question banks for CA, CS, CMA, Banking, SSC, Railways, UPSC and
                State PSC — built by rank holders, previewed before you pay, and delivered the
                moment you buy.
              </motion.p>
              <motion.div variants={heroItem} className="mt-8 flex flex-wrap gap-3.5">
                <MotionButton>
                  <Button size="lg" render={<Link href="#pricing">Browse question banks <ArrowRight className="ml-1 h-4 w-4" /></Link>} />
                </MotionButton>
                <MotionButton>
                  <Button size="lg" variant="outline" render={<Link href="#how">See how it works</Link>} />
                </MotionButton>
              </motion.div>
              <motion.div variants={heroItem} className="mt-9 flex items-center gap-3.5">
                <div className="flex">
                  {["RK", "AS", "PM", "TN"].map((initials, i) => (
                    <span
                      key={initials}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background font-heading text-[11px] font-bold text-white"
                      style={{
                        marginLeft: i === 0 ? 0 : -9,
                        background: ["#4F46E5", "#B8862E", "#157F4D", "#B3261E"][i],
                      }}
                    >
                      {initials}
                    </span>
                  ))}
                </div>
                <p className="text-[13.5px] text-muted-foreground">
                  <strong className="text-foreground">4.8/5</strong> average rating across
                  3,100+ verified purchases
                </p>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.2, 0.65, 0.3, 0.9] }}
            >
              <motion.div
                className="relative"
                animate={{ y: [0, -9, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="relative -rotate-1 rounded-[14px] border border-border bg-card shadow-[0_4px_8px_rgba(27,27,47,0.05),0_24px_48px_-16px_rgba(27,27,47,0.18)]">
                  <div className="flex items-start justify-between gap-3 p-6 pb-4.5">
                    <div>
                      <div className="font-mono text-[11.5px] font-bold tracking-wide text-primary uppercase">
                        CA Foundation · Paper 2
                      </div>
                      <div className="font-heading mt-2 max-w-[280px] text-xl font-semibold">
                        Business Laws — 600 Question Bank
                      </div>
                    </div>
                    <span className="rotate-6 rounded-md border-[1.5px] border-gold bg-gold-pale px-2.5 py-1.5 font-mono text-[10.5px] font-bold tracking-wide text-gold-ink uppercase">
                      Early Bird
                    </span>
                  </div>
                  <div className="mx-6 border-t-2 border-dashed border-border" />
                  <div className="flex items-end justify-between gap-3.5 p-6 pt-5">
                    <div>
                      <span className="font-mono text-sm text-muted-foreground line-through">₹899</span>
                      <span className="font-mono mt-0.5 block text-[28px] font-semibold">₹649</span>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <span className="mb-0.5 block text-[10.5px] tracking-wide uppercase">Offer ends in</span>
                      02d : 14h : 09m
                    </div>
                  </div>
                </div>
                <motion.div
                  className="absolute -top-6 -right-3.5 hidden items-center gap-2.5 rounded-xl border border-border bg-card p-3 px-3.5 shadow-md sm:flex"
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  <div>
                    <div className="text-[12.5px] font-semibold">Watermarked to you</div>
                    <div className="text-[11px] text-muted-foreground">rahul.k@email.com</div>
                  </div>
                </motion.div>
                <motion.div
                  className="absolute -bottom-5 -left-5 hidden items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 px-3.5 shadow-md sm:flex"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                >
                  <FileText className="h-4.5 w-4.5 shrink-0 text-primary" />
                  <div>
                    <div className="text-xs font-semibold">12-page preview</div>
                    <div className="text-[11px] text-muted-foreground">before you buy</div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="border-b border-border py-11">
          <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
            <p className="mb-5 text-center font-mono text-[11.5px] tracking-wide text-muted-foreground/80 uppercase">
              Question banks mapped to
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {examPills.map((exam) => (
                <span
                  key={exam}
                  className="rounded-full border border-border bg-secondary px-4 py-2 text-[13.5px] font-semibold text-muted-foreground"
                >
                  {exam}
                </span>
              ))}
            </div>
          </div>
        </section>

        <MentorSection />

        {/* FEATURES */}
        <section id="features" className="py-22">
          <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <Eyebrow>Why aspirants choose us</Eyebrow>
              <h2 className="font-heading mt-4 text-[2rem] leading-tight font-semibold tracking-tight">
                Built the way a topper actually prepares
              </h2>
              <p className="mt-3.5 text-base leading-relaxed text-muted-foreground">
                No bundled subscriptions or filler content — just the specific bank you need,
                priced fairly and delivered instantly.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 gap-5.5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 40}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="h-full rounded-[14px] border border-border bg-card p-6.5 hover:border-primary-light/40 hover:shadow-sm"
                  >
                    <div className="mb-4 flex h-10.5 w-10.5 items-center justify-center rounded-[10px] bg-accent text-primary">
                      <f.icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <h3 className="text-[16.5px] font-bold">{f.title}</h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                      {f.body}
                    </p>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-y border-border bg-secondary py-22">
          <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
            <Reveal className="mb-14 max-w-xl">
              <Eyebrow>From browse to download</Eyebrow>
              <h2 className="font-heading mt-4 text-[2rem] leading-tight font-semibold tracking-tight">
                Four steps, no detours
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <Reveal key={s.title} delay={i * 50} className="relative">
                  <div className="font-mono mb-4 flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-primary bg-card text-[13px] font-semibold text-primary">
                    {i + 1}
                  </div>
                  <h3 className="text-[15.5px] font-bold">{s.title}</h3>
                  <p className="mt-1.5 text-[13.8px] leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                  {i < steps.length - 1 && (
                    <div className="absolute top-4 left-[calc(100%-4px)] hidden h-px w-[calc(100%-24px)] border-t border-dashed border-border lg:block" />
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-22">
          <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <Eyebrow>This week&apos;s featured banks</Eyebrow>
              <h2 className="font-heading mt-4 text-[2rem] leading-tight font-semibold tracking-tight">
                Priced per bank. No subscriptions.
              </h2>
              <p className="mt-3.5 text-base leading-relaxed text-muted-foreground">
                Pay only for what you&apos;re revising right now. Early-bird banks are marked
                clearly, with the discount and deadline shown up front.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
              {featuredBanks.map((bank, i) => (
                <Reveal key={bank.title} delay={i * 60}>
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`relative flex h-full flex-col rounded-[14px] border bg-card shadow-sm hover:shadow-lg ${
                      bank.popular ? "border-primary ring-1 ring-primary" : "border-border"
                    }`}
                  >
                    {bank.popular && (
                      <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11.5px] font-bold text-primary-foreground">
                        Most purchased
                      </span>
                    )}
                    <div className="p-6.5 pb-5">
                      <div className="font-mono text-[11px] font-semibold tracking-wide text-primary uppercase">
                        {bank.category}
                      </div>
                      <div className="font-heading mt-2 text-[19px] leading-snug font-semibold">
                        {bank.title}
                      </div>
                      <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                        {bank.desc}
                      </p>
                    </div>
                    <div className="mx-6 border-t-2 border-dashed border-border" />
                    <div className="flex flex-wrap items-baseline gap-2.5 px-6.5 pt-5">
                      {bank.oldPrice && (
                        <span className="font-mono text-[15px] text-muted-foreground line-through">
                          {bank.oldPrice}
                        </span>
                      )}
                      <span className="font-mono text-[27px] font-semibold">{bank.price}</span>
                    </div>
                    <div className="mt-1 px-6.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                          bank.badge.tone === "gold"
                            ? "border border-gold/40 bg-gold-pale text-gold-ink"
                            : "border border-success/30 bg-success/10 text-success"
                        }`}
                      >
                        {bank.badge.tone === "gold" && <Clock className="h-3.5 w-3.5" />}
                        {bank.badge.label}
                      </span>
                    </div>
                    <ul className="mt-4.5 flex flex-col gap-2.5 px-6.5 text-[13.8px] text-muted-foreground">
                      {bank.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto p-6.5 pt-5.5">
                      <MotionButton block>
                        <Button
                          variant={bank.popular ? "default" : "outline"}
                          className="w-full"
                          render={<Link href="/question-banks">{bank.popular ? "Buy this bank" : "Preview sample"}</Link>}
                        />
                      </MotionButton>
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>

            <p className="mt-9 text-center text-sm text-muted-foreground">
              Have a coupon code? Apply it at checkout —{" "}
              <Link href="/question-banks" className="font-semibold text-primary hover:underline">
                browse all question banks →
              </Link>
            </p>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="py-22">
          <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
            <Reveal>
              <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-primary-dark to-[#1b1660] px-2 py-16">
                <div className="mx-auto mb-12 max-w-xl px-6 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide text-[#e4e1fb] uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                    What aspirants say
                  </span>
                  <h2 className="font-heading mt-4 text-[2rem] leading-tight font-semibold text-white">
                    Results, not just reviews
                  </h2>
                </div>
                <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 px-6 md:grid-cols-3">
                  {testimonials.map((t) => (
                    <div
                      key={t.name}
                      className="rounded-[14px] border border-white/15 bg-white/[0.06] p-6.5 backdrop-blur"
                    >
                      <p className="text-[14.5px] leading-relaxed text-[#efeefb]">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <div className="mt-5 flex items-center gap-2.5">
                        <span
                          className={`font-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${t.color}`}
                        >
                          {t.name.split(" ").map((p) => p[0]).join("")}
                        </span>
                        <div>
                          <div className="text-[13.5px] font-bold text-white">{t.name}</div>
                          <div className="text-xs text-[#c7c4ee]">{t.exam}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-22">
          <div className="mx-auto max-w-3xl px-7">
            <Reveal className="mb-12 max-w-xl">
              <Eyebrow>Questions, answered</Eyebrow>
              <h2 className="font-heading mt-4 text-[2rem] leading-tight font-semibold tracking-tight">
                Before you ask in chat
              </h2>
            </Reveal>
            <Reveal>
              <Accordion>
                {faqs.map((item, i) => (
                  <AccordionItem key={item.q} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-base font-semibold">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-[14.5px] leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="pb-22">
          <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
            <Reveal>
              <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-primary to-primary-dark px-8 py-18 text-center text-white">
                <h2 className="font-heading relative mx-auto max-w-2xl text-[2rem] leading-tight font-semibold text-white md:text-[2.25rem]">
                  Your next exam doesn&apos;t wait. Neither should your prep.
                </h2>
                <p className="relative mx-auto mt-3.5 max-w-md text-[15.5px] text-[#d8d6f5]">
                  Browse question banks by exam, preview a few pages for free, and download the
                  moment you&apos;re ready.
                </p>
                <div className="relative mt-7 flex flex-wrap justify-center gap-3.5">
                  <MotionButton>
                    <Button
                      size="lg"
                      className="bg-white text-primary-dark hover:bg-[#f1f0ff]"
                      render={<Link href="#pricing">Browse question banks</Link>}
                    />
                  </MotionButton>
                  <MotionButton>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/35 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
                      render={<Link href="/register">Create a free account</Link>}
                    />
                  </MotionButton>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-13">
        <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="font-heading flex items-center gap-2.5 text-[19px] font-semibold">
                <span className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-gradient-to-br from-primary-light to-primary-dark text-[15px] font-bold text-white">
                  D
                </span>
                Decode with Shakti
              </Link>
              <p className="mt-3.5 max-w-[260px] text-[13.8px] leading-relaxed text-muted-foreground">
                Exam-pattern question banks for India&apos;s toughest competitive exams —
                previewed before you buy, yours the moment you pay.
              </p>
            </div>
            <div>
              <h4 className="mb-3.5 text-xs font-bold tracking-wide text-muted-foreground/80 uppercase">
                Explore
              </h4>
              <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-primary">Why us</Link></li>
                <li><Link href="#how" className="hover:text-primary">How it works</Link></li>
                <li><Link href="#pricing" className="hover:text-primary">Question banks</Link></li>
                <li><Link href="#faq" className="hover:text-primary">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3.5 text-xs font-bold tracking-wide text-muted-foreground/80 uppercase">
                Exams
              </h4>
              <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <li><span>CA · CS · CMA</span></li>
                <li><span>Banking</span></li>
                <li><span>SSC · Railways</span></li>
                <li><span>UPSC · State PSC</span></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3.5 text-xs font-bold tracking-wide text-muted-foreground/80 uppercase">
                Support
              </h4>
              <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <li><Link href="/contact" className="hover:text-primary">Contact us</Link></li>
                <li><Link href="/terms" className="hover:text-primary">Terms of use</Link></li>
                <li><Link href="/privacy" className="hover:text-primary">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-11 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5.5 text-[13px] text-muted-foreground/80">
            <span>© {new Date().getFullYear()} Decode with Shakti. All rights reserved.</span>
            <span>Made for aspirants, not algorithms.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
