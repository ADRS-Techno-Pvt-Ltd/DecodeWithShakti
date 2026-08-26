import Link from "next/link";
import { Eye, ShieldCheck, ListChecks } from "lucide-react";
import { AuthCardMotion } from "@/components/landing/auth-card-motion";

const trustPoints = [
  { icon: Eye, text: "Preview real pages before you pay" },
  { icon: ShieldCheck, text: "Every download is watermarked, yours alone" },
  { icon: ListChecks, text: "CA · CS · CMA · Banking · SSC · Railways · UPSC · State PSC" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary-dark px-11 py-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 h-64 w-64 rounded-full bg-gold/20 blur-3xl"
        />

        <Link
          href="/"
          className="font-heading relative flex items-center gap-2.5 text-[19px] font-semibold"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-[15px] font-bold text-white ring-1 ring-white/25">
            D
          </span>
          Decode with Shakti
        </Link>

        <div className="relative">
          <h1 className="font-heading max-w-sm text-[2rem] leading-tight font-semibold">
            Your next exam doesn&apos;t wait. Neither should your prep.
          </h1>
          <p className="mt-3.5 max-w-sm text-[15px] text-[#d8d6f5]">
            Exam-pattern question banks for India&apos;s toughest competitive exams — previewed
            before you buy, yours the moment you pay.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {trustPoints.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-[14.5px] text-white/90">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <p.icon className="h-3.5 w-3.5" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[13px] text-white/60">Mentored by CA Shakti Tiwari</p>
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-accent/80 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-gold-pale/70 blur-3xl"
        />

        <Link
          href="/"
          className="font-heading relative flex items-center gap-2.5 px-6 pt-6 text-[17px] font-semibold lg:hidden"
        >
          <span className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-gradient-to-br from-primary-light to-primary-dark text-[14px] font-bold text-white">
            D
          </span>
          Decode with Shakti
        </Link>

        <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
          <AuthCardMotion>{children}</AuthCardMotion>
          <div className="mt-6 flex items-center gap-2 text-[13px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Your details are encrypted and never shared.
          </div>
        </div>
      </div>
    </div>
  );
}
