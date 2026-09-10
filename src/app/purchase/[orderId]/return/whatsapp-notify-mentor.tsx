import { MessageCircle } from "lucide-react";

const ADMIN_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_ADMIN_NUMBER ?? "";

export function buildWhatsAppUrl(input: {
  studentName: string;
  studentPhone: string;
  mentorshipTitle: string;
  invoiceNumber: string;
}): string {
  const message = [
    "Hello, I have successfully purchased the mentorship.",
    "",
    `Student Name: ${input.studentName}`,
    `Phone Number: ${input.studentPhone}`,
    `Mentorship: ${input.mentorshipTitle}`,
    `Invoice Number: ${input.invoiceNumber}`,
    "",
    "Please notify the mentor about my purchase.",
    "",
    "Please attach your invoice PDF before sending this message.",
    "",
    "Thank you.",
  ].join("\n");

  return `https://wa.me/${ADMIN_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Student-initiated WhatsApp Click-to-Chat — no API, no server call, no
 * secrets. A plain anchor click is never blocked by popup blockers (unlike
 * an auto-triggered window.open() from a useEffect, which most browsers
 * silently swallow since it isn't a direct user gesture) — so this is just
 * an always-visible button, safe to click more than once.
 */
export function WhatsAppNotifyMentor(props: {
  purchaseId: string;
  studentName: string;
  studentPhone: string;
  mentorshipTitle: string;
  invoiceNumber: string;
}) {
  const url = buildWhatsAppUrl(props);

  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-left">
      <p className="text-sm font-medium">Notify your mentor</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Download your invoice, attach it in WhatsApp, and then send the message.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-primary/30 py-3 text-center text-[15px] font-medium text-primary-dark transition-colors hover:bg-primary/10"
      >
        <MessageCircle className="h-4 w-4" />
        Notify Mentor on WhatsApp
      </a>
    </div>
  );
}
