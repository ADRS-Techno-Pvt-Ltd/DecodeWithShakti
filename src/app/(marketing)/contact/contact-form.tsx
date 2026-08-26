"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(data: ContactInput) {
    setSubmitting(true);
    const res = await fetch("/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not send your message. Please try again.");
      return;
    }

    toast.success("Message sent — we'll get back to you soon.");
    setSent(true);
    reset();
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <h3 className="font-heading text-lg font-semibold">Thanks — message sent</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          We&apos;ve received your message and will reply to your email within 1–2 business days.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" placeholder="e.g. Question about a purchase" {...register("subject")} />
        {errors.subject && <p className="text-destructive text-xs">{errors.subject.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" rows={6} {...register("message")} />
        {errors.message && <p className="text-destructive text-xs">{errors.message.message}</p>}
      </div>
      <Button type="submit" disabled={submitting} className="w-full sm:w-fit">
        {submitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
