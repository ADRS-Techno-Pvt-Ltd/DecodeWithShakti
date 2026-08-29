"use client";

import { Award } from "lucide-react";
import { Reveal } from "./reveal";

const stats = [
  { value: "10+", label: "Years mentoring aspirants" },
  { value: "1,000+", label: "Students guided" },
  { value: "10+", label: "Question banks authored" },
];

export function MentorSection() {
  return (
    <section id="mentor" className="py-22 border-b border-border">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="grid grid-cols-1 items-center gap-12 rounded-[20px] border border-border bg-card p-9 shadow-sm md:grid-cols-[220px_1fr] md:p-11">
            <div className="flex flex-col items-center gap-3.5">
              <div className="flex h-42 w-42 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary-dark shadow-[0_0_0_6px_var(--accent),0_16px_32px_-14px_rgba(53,47,158,0.5)]">
                <span className="font-heading text-center text-3xl leading-tight font-semibold text-white">
                  CA
                  <br />
                  ST
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold-pale px-3 py-1.5 text-xs font-semibold text-gold-ink">
                <Award className="h-3.5 w-3.5" /> Chartered Accountant
              </span>
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide text-accent-foreground uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                The person behind the papers
              </span>
              <h2 className="font-heading mt-4 text-3xl font-semibold tracking-tight text-foreground">
                Mentored by CA Shakti Tiwari
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
                Every question bank on this platform is written and reviewed by CA Shakti Tiwari
                before it&apos;s published — not outsourced, not recycled from old material. The
                goal is simple: papers that feel like the real exam, because they&apos;re built by
                someone who has sat the real exam.
              </p>
              <div className="mt-7 flex flex-wrap gap-9">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="font-mono text-2xl font-semibold text-primary">
                      {s.value}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
