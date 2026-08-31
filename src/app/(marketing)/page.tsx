"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { motion, type Variants } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  Clock,
  DownloadCloud,
  ShieldCheck,
  Receipt,
  ListChecks,
  FileText,
  Check,
  Quote,
  Star,
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
import { BannerCarousel } from "@/components/landing/banner-carousel";
import { BrandLogo } from "@/components/brand-logo";
import { SiteHeader } from "@/components/site-header";
import { useFeaturedBanks, type FeaturedBankCard } from "./use-featured-banks";
import { useBanners } from "./use-banners";
import { useFaqs } from "./use-faqs";
import { useCategories } from "./use-categories";
import type { Category } from "@/features/categories/api";

const levels = [
  {
    slug: "ca-inter-accounts",
    label: "CA Inter — Accounts",
    desc: "Paper-mapped Accounts question sets for CA Inter, built to the current ICAI pattern.",
  },
  {
    slug: "ca-inter-costing",
    label: "CA Inter — Costing",
    desc: "Costing banks with exam-style problems and worked, step-by-step solutions.",
  },
  {
    slug: "ca-inter-taxation",
    label: "CA Inter — Taxation",
    desc: "Taxation question sets covering direct and indirect tax topics for CA Inter.",
  },
  {
    slug: "ca-final-audit",
    label: "CA Final — Audit",
    desc: "Audit exam-pattern sets, each one reviewed personally by Shakti before it's published.",
  },
];

const fallbackCategories: Category[] = [
  { id: "ca-inter", name: "CA Intermediate", slug: "ca-inter" },
  { id: "ca-final", name: "CA Final", slug: "ca-final" },
];

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

// Fallback cards for the landing "Priced per bank" section, shown only when no question
// bank is marked "featured" in the admin. Otherwise the section renders the real featured
// banks — see `useFeaturedBanks`.
const featuredBanks: FeaturedBankCard[] = [
  {
    category: "CA Inter · Costing",
    title: "Costing & Financial Management — 900 Question Bank",
    desc: "Topic-wise sets covering Marginal Costing, Standard Costing and Budgetary Control, plus 5 full-length mock papers.",
    oldPrice: null,
    price: "₹549",
    badge: { label: "Regular price", tone: "green" as const },
    earlyBirdEndsAt: null,
    thumbnailUrl: null,
    bullets: ["15-page free preview", "5 full-length mock papers", "Instant download after purchase"],
    popular: true,
    href: "/question-banks",
    previewPageCount: 15,
  },
  {
    category: "CA Final · Audit",
    title: "Advanced Auditing — 480 Question Bank",
    desc: "Case-study based questions in the exact ICAI pattern, updated for the current syllabus.",
    oldPrice: "₹749",
    price: "₹579",
    badge: { label: "Early bird · ends in 5 days", tone: "gold" as const },
    earlyBirdEndsAt: null,
    thumbnailUrl: null,
    bullets: ["10-page free preview", "480 case-study questions", "Instant download after purchase"],
    popular: false,
    href: "/question-banks",
    previewPageCount: 10,
  },
];

const testimonials = [
  {
    quote:
      "Decode with Shakti's test series is a game changer. The level of questions and detailed solutions helped me improve my scores drastically.",
    name: "Riya Singh",
    exam: "CA Intermediate Topper",
    color: "bg-primary",
  },
  {
    quote:
      "The questions are exam oriented and explained so well. It feels like learning from toppers. Highly recommended!",
    name: "Aman Verma",
    exam: "CA Inter Student",
    color: "bg-primary",
  },
  {
    quote:
      "I scored 70% in CA Inter just because of consistent practice on Decode with Shakti.",
    name: "Manan Jain",
    exam: "CA Inter Topper",
    color: "bg-primary",
  },
];

/** Fallback shown only if the admin hasn't published any FAQs (or the fetch is still pending). */
const fallbackFaqs = [
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

const DAY_MS = 86_400_000;

function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

/**
 * Renders `fallback` normally, but once the early-bird deadline is under 24h away it
 * switches to a live, per-second countdown ("Early bird · ends in 5h 23m 07s").
 */
function EarlyBirdBadgeLabel({
  endsAt,
  fallback,
}: {
  endsAt: string | null;
  fallback: string;
}) {
  const target = endsAt ? new Date(endsAt).getTime() : null;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (target == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (target == null || now == null) return <>{fallback}</>;
  const remaining = target - now;
  if (remaining <= 0 || remaining >= DAY_MS) return <>{fallback}</>;
  return <>Early bird · ends in {formatCountdown(remaining)}</>;
}

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
  const { banks: displayedBanks, loading: banksLoading } = useFeaturedBanks(featuredBanks);
  const { banners, loading: bannersLoading } = useBanners();
  const { faqs } = useFaqs(fallbackFaqs);
  const { categories } = useCategories(fallbackCategories);

  return (
    <>
      <SiteHeader />

      <main>
        <BannerCarousel banners={banners} loading={bannersLoading} />

        {/* HERO */}
        <section className="border-b border-border bg-gradient-to-b from-[#fcfcfe] to-background pt-8 pb-22">
          <div className="mx-auto grid max-w-6xl 2xl:max-w-[1440px] grid-cols-1 items-center gap-14 px-7 md:grid-cols-[1.05fr_0.95fr]">
            <motion.div variants={heroContainer} initial="hidden" animate="show">
              <motion.h1
                variants={heroItem}
                className="font-heading text-[2.6rem] leading-[1.1] font-semibold tracking-tight text-foreground md:text-[3.4rem]"
              >
                Built the way a <span className="text-primary">topper actually</span> prepares.
              </motion.h1>
              <motion.p
                variants={heroItem}
                className="mt-5 max-w-lg text-[17.5px] leading-relaxed text-muted-foreground"
              >
                No bundled subscriptions or filler content — just the exact question
                bank you need, previewed before you pay and delivered the moment you buy.
              </motion.p>
              <motion.div variants={heroItem} className="mt-8 flex flex-wrap gap-3.5">
                <MotionButton>
                  <Button size="lg" render={<Link href="/question-banks">Browse question banks <ArrowRight className="ml-1 h-4 w-4" /></Link>} />
                </MotionButton>
                <MotionButton>
                  <Button size="lg" variant="outline" render={<Link href="#how">See how it works</Link>} />
                </MotionButton>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.2, 0.65, 0.3, 0.9] }}
            >
              <motion.div
                className="relative w-full"
                animate={{ y: [0, -9, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="absolute inset-8 rounded-[48%] bg-accent blur-3xl" />
                <Image
                  src="/hero/heroimage-removebg-preview.png"
                  alt="Laptop showing Decode with Shakti next to CA Intermediate and CA Final question banks, a notebook reading 'Consistency + Strategy = Result', and a coffee mug"
                  width={612}
                  height={408}
                  priority
                  className="relative mx-auto h-auto w-[88%]"
                  sizes="(min-width: 768px) 48vw, 90vw"
                />
              </motion.div>
            </motion.div>
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

        {/* CATEGORIES */}
        <section id="categories" className="py-22">
          <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <Eyebrow>Mapped to your exam</Eyebrow>
              <h2 className="font-heading mt-4 text-[2rem] leading-tight font-semibold tracking-tight">
                Pick your level. Start decoding.
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-5.5 sm:grid-cols-2 lg:grid-cols-4">
              {levels.map((lvl, i) => (
                <Reveal key={lvl.slug} delay={i * 50}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="h-full rounded-[14px] border border-border bg-card hover:border-primary-light/40 hover:shadow-sm"
                  >
                    <div className="border-b border-border p-6.5 pb-5">
                      <span className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Category
                      </span>
                      <h3 className="font-heading mt-2 text-lg leading-snug font-bold">{lvl.label}</h3>
                    </div>
                    <div className="p-6.5 pt-5">
                      <p className="text-[14.5px] leading-relaxed text-muted-foreground">
                        {lvl.desc}
                      </p>
                      <Link
                        href={`/question-banks?category=${lvl.slug}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-primary hover:underline"
                      >
                        Browse banks <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* OFFERS */}
        <section id="offers" className="border-y border-border bg-secondary py-22">
          <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
            <Reveal className="mx-auto mb-14 max-w-xl text-center">
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="font-heading mt-4 text-[2rem] leading-tight font-semibold tracking-tight">
                Pay for the paper you need, not the bundle.
              </h2>
              <p className="mt-3.5 text-base leading-relaxed text-muted-foreground">
                Test series, decode sheets and mentorship — priced separately, so you only
                ever spend on what your prep actually needs.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 items-stretch gap-5.5 lg:grid-cols-[1fr_1fr_1.1fr]">
              <Reveal delay={0}>
                <div className="flex h-full flex-col gap-4.5 rounded-[14px] border border-border bg-card p-6.5">
                  <div>
                    <h3 className="font-heading text-[19px] font-semibold">Test series</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      Full-length papers set to the real exam pattern, marked against a
                      topper&apos;s answer key.
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2.5">
                    <div className="flex items-baseline justify-between gap-3 rounded-[11px] border border-border px-4 py-3.5">
                      <span className="text-[13.5px] font-semibold text-muted-foreground">Per subject</span>
                      <span className="font-heading text-lg font-semibold whitespace-nowrap">
                        ₹900<span className="ml-0.5 font-sans text-xs font-medium text-muted-foreground/70">/subject</span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 rounded-[11px] border border-border px-4 py-3.5">
                      <span className="text-[13.5px] font-semibold text-muted-foreground">Per group</span>
                      <span className="font-heading text-lg font-semibold whitespace-nowrap">
                        ₹2,500<span className="ml-0.5 font-sans text-xs font-medium text-muted-foreground/70">/group</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={60}>
                <div className="flex h-full flex-col gap-4.5 rounded-[14px] border border-border bg-card p-6.5">
                  <div>
                    <h3 className="font-heading text-[19px] font-semibold">Decode sheets</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      A topper&apos;s own line-by-line breakdown of how each answer should be
                      structured.
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2.5">
                    <div className="flex items-baseline justify-between gap-3 rounded-[11px] border border-border px-4 py-3.5">
                      <span className="text-[13.5px] font-semibold text-muted-foreground">Per subject</span>
                      <span className="font-heading text-lg font-semibold whitespace-nowrap">
                        ₹139<span className="ml-0.5 font-sans text-xs font-medium text-muted-foreground/70">/subject</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="flex h-full flex-col gap-4.5 rounded-[14px] border border-border bg-card p-6.5">
                  <div>
                    <h3 className="font-heading text-[19px] font-semibold">CA Final mentorship</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      Direct guidance from CA Shakti Tiwari — strategy, revision order, and the
                      final stretch before the exam.
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2.5">
                    <div className="flex items-baseline justify-between gap-3 rounded-[11px] border border-border px-4 py-3.5">
                      <span className="text-[13.5px] font-semibold text-muted-foreground">Group 1</span>
                      <span className="font-heading text-lg font-semibold whitespace-nowrap">
                        ₹4,999<span className="ml-0.5 font-sans text-xs font-medium text-muted-foreground/70">/group</span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 rounded-[11px] border border-border px-4 py-3.5">
                      <span className="text-[13.5px] font-semibold text-muted-foreground">Group 2</span>
                      <span className="font-heading text-lg font-semibold whitespace-nowrap">
                        ₹4,999<span className="ml-0.5 font-sans text-xs font-medium text-muted-foreground/70">/group</span>
                      </span>
                    </div>
                    <div className="relative flex items-baseline justify-between gap-3 rounded-[11px] bg-primary px-4 py-3.5">
                      <span className="absolute -top-2.5 right-3.5 rounded-full bg-gold px-2.5 py-1 text-[10.5px] font-semibold text-white">
                        Save ₹1,499
                      </span>
                      <span className="text-[13.5px] font-semibold text-primary-foreground/80">Both groups</span>
                      <span className="font-heading text-lg font-semibold whitespace-nowrap text-primary-foreground">
                        ₹8,499
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
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
              {banksLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex h-full flex-col rounded-[14px] border border-border bg-card shadow-sm"
                    >
                      <div className="p-6.5 pb-5">
                        <div className="mb-4 aspect-video animate-pulse rounded-[10px] bg-muted" />
                        <div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
                        <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
                        <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
                      </div>
                      <div className="mx-6 border-t-2 border-dashed border-border" />
                      <div className="px-6.5 pt-5">
                        <div className="h-7 w-20 animate-pulse rounded bg-muted" />
                        <div className="mt-3 h-6 w-32 animate-pulse rounded bg-muted" />
                      </div>
                      <div className="mt-auto p-6.5 pt-5.5">
                        <div className="h-10 w-full animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))
                : displayedBanks.map((bank, i) => (
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
                      <Link
                        href={bank.href}
                        className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-[10px] bg-muted text-primary"
                      >
                        {bank.thumbnailUrl ? (
                          <img
                            src={bank.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <FileText className="h-7 w-7" strokeWidth={1.5} />
                        )}
                      </Link>
                      <div className="font-mono text-[11px] font-semibold tracking-wide text-primary uppercase">
                        {bank.category}
                      </div>
                      <div className="font-heading mt-2 text-[19px] leading-snug font-semibold">
                        {bank.title}
                      </div>
                      <p className="mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-muted-foreground">
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
                        {bank.badge.tone === "gold" ? (
                          <EarlyBirdBadgeLabel
                            endsAt={bank.earlyBirdEndsAt}
                            fallback={bank.badge.label}
                          />
                        ) : (
                          bank.badge.label
                        )}
                      </span>
                    </div>
                    {bank.bullets.length > 0 && (
                      <ul className="mt-4.5 flex flex-col gap-2.5 px-6.5 text-[13.8px] text-muted-foreground">
                        {bank.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto p-6.5 pt-5.5">
                      <MotionButton block>
                        <Button
                          variant={bank.popular ? "default" : "outline"}
                          className="w-full"
                          render={<Link href={bank.href}>{bank.popular ? "Buy this bank" : "Preview sample"}</Link>}
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
            <Reveal className="mb-12 flex items-center justify-center gap-3.5">
              <ArrowLeft className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
              <h2 className="font-heading text-center text-[2rem] leading-tight font-semibold tracking-tight text-primary">
                What our students say
              </h2>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
            </Reveal>

            <div className="grid grid-cols-1 gap-5.5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.name} delay={i * 40} className="h-full">
                  <div className="flex h-full flex-col rounded-[14px] border border-primary-light/25 bg-card p-6.5">
                    <Quote className="h-7 w-7 text-primary/60" fill="currentColor" strokeWidth={0} />
                    <div className="mt-3 flex gap-0.5 text-gold">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                      ))}
                    </div>
                    <p className="mt-3.5 text-[14.5px] leading-relaxed text-foreground/90">
                      {t.quote}
                    </p>
                    <div className="mt-auto flex items-center gap-2.5 pt-5">
                      <span
                        className={`font-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${t.color}`}
                      >
                        {t.name.split(" ").map((p) => p[0]).join("")}
                      </span>
                      <div>
                        <div className="text-[13.5px] font-bold text-primary">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.exam}</div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
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
                      render={<Link href="/question-banks">Browse question banks</Link>}
                    />
                  </MotionButton>
                  {!session?.user && (
                    <MotionButton>
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white/35 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
                        render={<Link href="/register">Create a free account</Link>}
                      />
                    </MotionButton>
                  )}
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
              <BrandLogo imgClassName="h-8 w-auto" />
              <p className="mt-3.5 max-w-[260px] text-[13.8px] leading-relaxed text-muted-foreground">
                Exam-pattern question banks for CA Inter and Final —
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
                Categories
              </h4>
              <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/question-banks?category=${cat.slug}`} className="hover:text-primary">
                      {cat.name}
                    </Link>
                  </li>
                ))}
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
