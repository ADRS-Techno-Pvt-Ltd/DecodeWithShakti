"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";

const fieldBase =
  "w-full border-0 border-b-[1.5px] border-primary/25 bg-transparent pt-1.5 pb-2 text-[15px] text-foreground caret-primary-light outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary-light read-only:text-muted-foreground aria-[invalid=true]:border-[color:var(--gold-ink)]";

const labelBase =
  "mb-2 block font-mono text-[10.5px] tracking-[0.1em] text-muted-foreground uppercase";

export function ContactForm({
  stampDate,
}: {
  stampDate: string;
}) {
  const reduceMotion = useReducedMotion();
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(data: ContactInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Could not send your message right now. Please try again shortly.");
        return;
      }
      setSentTo(data.email);
      setSent(true);
      toast.success("Message sent — a person will reply soon.");
    } catch {
      toast.error("Could not send your message right now. Please try again shortly.");
    } finally {
      setSubmitting(false);
    }
  }

  function sendAnother() {
    setSent(false);
    setSentTo("");
    reset();
  }

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(27,27,47,0.04),0_22px_46px_-24px_rgba(37,31,115,0.3)]">
      {/* file tab */}
      <span className="absolute top-0 left-[34px] z-[3] rounded-b-[6px] bg-primary px-3 py-[5px] pb-1 font-mono text-[10px] tracking-[0.16em] text-white uppercase">
        File · Contact
      </span>
      {/* folded corner */}
      <span
        aria-hidden
        className="absolute -top-3 -right-3 h-6 w-6 rotate-45 border-b border-l border-border bg-background"
      />

      <div className="flex items-center px-6 pt-6 pb-4 font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase sm:px-8">
        <span>Filed under — support</span>
      </div>
      <div className="mx-6 border-t-[1.5px] border-dashed border-primary/20 sm:mx-8" />

      <div className="grid grid-cols-1 sm:grid-cols-[46px_minmax(0,1fr)]">
        <div className="hidden flex-col items-center gap-10 border-r-[1.5px] border-dashed border-primary/20 pt-14 sm:flex">
          {[0, 1, 2].map((n) => (
            <span
              key={n}
              className="h-[11px] w-[11px] rounded-full border border-primary/25 bg-background shadow-[inset_0_1.5px_2px_rgba(37,31,115,0.16)]"
            />
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="relative min-w-0 px-6 py-7 sm:px-8">
          <div className="mb-5 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7">
            <div>
              <label htmlFor="name" className={labelBase}>
                Your name
              </label>
              <input
                id="name"
                placeholder="Ananya Rao"
                autoComplete="name"
                readOnly={sent}
                aria-invalid={!!errors.name}
                className={fieldBase}
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-[color:var(--gold-ink)]">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className={labelBase}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                readOnly={sent}
                aria-invalid={!!errors.email}
                className={fieldBase}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-[color:var(--gold-ink)]">
                  {errors.email.message ?? "Enter a valid email so our reply reaches you."}
                </p>
              )}
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="subject" className={labelBase}>
              Subject
            </label>
            <input
              id="subject"
              placeholder="e.g. Question about a purchase"
              readOnly={sent}
              aria-invalid={!!errors.subject}
              className={fieldBase}
              {...register("subject")}
            />
            {errors.subject && (
              <p className="mt-1.5 text-xs text-[color:var(--gold-ink)]">{errors.subject.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="message" className={labelBase}>
              Message
            </label>
            <textarea
              id="message"
              rows={4}
              placeholder="Write your note here…"
              readOnly={sent}
              aria-invalid={!!errors.message}
              className={`${fieldBase} font-heading min-h-[116px] resize-y leading-[28px] [background-image:repeating-linear-gradient(transparent,transparent_27px,var(--border)_27px,var(--border)_28px)]`}
              {...register("message")}
            />
            {errors.message && (
              <p className="mt-1.5 text-xs text-[color:var(--gold-ink)]">{errors.message.message}</p>
            )}
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p
              aria-live="polite"
              className={`max-w-[34ch] text-[12.5px] ${
                sent ? "font-medium text-success" : "text-muted-foreground"
              }`}
            >
              {sent
                ? `Sent from ${sentTo} — a person reads every message and we'll reply within 1–2 business days.`
                : "A person reads every message, no auto-replies."}
            </p>

            {sent ? (
              <button
                type="button"
                onClick={sendAnother}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                Send another
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.97] disabled:opacity-60 sm:w-auto"
              >
                {submitting ? "Sending…" : "Send message"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* rubber stamp */}
          <motion.div
            aria-hidden
            initial={false}
            animate={
              sent
                ? { opacity: 0.92, scale: 1, rotate: -13 }
                : { opacity: 0, scale: reduceMotion ? 1 : 0.55, rotate: -13 }
            }
            transition={
              reduceMotion
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 320, damping: 16 }
            }
            className="pointer-events-none absolute top-14 right-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-success text-center font-mono text-[9px] leading-[1.4] tracking-[0.1em] text-success uppercase sm:right-8"
          >
            <span className="absolute inset-[5px] rounded-full border border-dashed border-success" />
            <span className="px-2">
              Received
              <br />
              {stampDate}
            </span>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
