import { readFileSync } from "fs";
import { join } from "path";
import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

const FROM = process.env.EMAIL_FROM ?? "no-reply@example.com";

// Absolute base URL for logo/links inside emails (email clients can't resolve
// relative paths). NEXTAUTH_URL is already the canonical site origin.
const SITE_URL = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.ADMIN_EMAIL ?? FROM;

// Embedded as a CID inline attachment (not a remote <img src>) so the logo
// always renders regardless of NEXTAUTH_URL or whether the site is publicly
// reachable — email clients load it straight from the message itself.
const LOGO_CID = "brand-logo";
let LOGO_BUFFER: Buffer | null = null;
try {
  LOGO_BUFFER = readFileSync(join(process.cwd(), "public", "logo.png"));
} catch {
  LOGO_BUFFER = null;
}

// ── Brand palette (mirrors src/app/globals.css) ─────────────────────────────
const BRAND = {
  primary: "#352f9e",
  primaryLight: "#4f46e5",
  ink: "#111827",
  body: "#374151",
  muted: "#6b7280",
  border: "#e5e7eb",
  canvas: "#f4f4f7",
  gold: "#c99a2e",
};

const BRAND_NAME = "Decode with Shakti";
const BRAND_TAGLINE = "CA exam prep, mentored by CA Shakti Tiwari";

type Cta = { label: string; url: string };

/**
 * Wraps content in the shared branded shell — logo header, card body, footer.
 * `intro` is a short lead line; `rows` is an optional label/value detail table;
 * `paragraphs` are extra body lines; `cta` renders the primary button.
 */
function renderEmail(opts: {
  preheader: string;
  heading: string;
  intro?: string;
  paragraphs?: string[];
  rows?: { label: string; value: string }[];
  cta?: Cta;
  outro?: string;
}): string {
  const { preheader, heading, intro, paragraphs = [], rows = [], cta, outro } = opts;

  const logo = LOGO_BUFFER
    ? `<img src="cid:${LOGO_CID}" width="176" alt="${BRAND_NAME}" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:176px;" />`
    : `<span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:${BRAND.primary};">${BRAND_NAME}</span>`;

  const rowsHtml = rows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 4px;border-collapse:collapse;">
        ${rows
          .map(
            (r) => `<tr>
              <td style="padding:9px 0;border-bottom:1px solid ${BRAND.border};font:400 13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};width:38%;vertical-align:top;">${r.label}</td>
              <td style="padding:9px 0;border-bottom:1px solid ${BRAND.border};font:600 14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};vertical-align:top;">${r.value}</td>
            </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font:400 15px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.body};">${p}</p>`,
    )
    .join("");

  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
        <tr><td style="border-radius:8px;background:${BRAND.primary};">
          <a href="${cta.url}" style="display:inline-block;padding:13px 26px;font:600 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;">${cta.label}</a>
        </td></tr>
      </table>`
    : "";

  const outroHtml = outro
    ? `<p style="margin:20px 0 0;font:400 13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};">${outro}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.canvas};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
          <tr><td style="height:4px;background:linear-gradient(90deg,${BRAND.primary},${BRAND.primaryLight});"></td></tr>
          <tr>
            <td style="padding:28px 36px 0;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 36px 32px;">
              <h1 style="margin:0 0 14px;font:700 21px/1.35 Georgia,'Times New Roman',serif;color:${BRAND.ink};">${heading}</h1>
              ${intro ? `<p style="margin:0 0 16px;font:400 15px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.body};">${intro}</p>` : ""}
              ${paragraphsHtml}
              ${rowsHtml}
              ${ctaHtml}
              ${outroHtml}
            </td>
          </tr>
          <tr><td style="height:1px;background:${BRAND.border};"></td></tr>
          <tr>
            <td style="padding:20px 36px 26px;">
              <p style="margin:0 0 4px;font:600 13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">${BRAND_NAME}</p>
              <p style="margin:0 0 10px;font:400 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};">${BRAND_TAGLINE}</p>
              <p style="margin:0;font:400 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};">
                Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primaryLight};text-decoration:none;">${SUPPORT_EMAIL}</a>${SITE_URL ? ` &nbsp;·&nbsp; <a href="${SITE_URL}" style="color:${BRAND.primaryLight};text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, "")}</a>` : ""}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font:400 11px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#9ca3af;">
          © ${new Date().getFullYear()} ${BRAND_NAME}. This is an automated message — please do not reply directly.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text counterpart with a consistent signature. */
function renderText(lines: string[]): string {
  return [...lines, "", "—", BRAND_NAME, BRAND_TAGLINE].join("\n");
}

type SendInput = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
};

async function send({ to, subject, text, html, replyTo, attachments }: SendInput): Promise<void> {
  const allAttachments = [
    ...(LOGO_BUFFER ? [{ filename: "logo.png", content: LOGO_BUFFER, contentId: LOGO_CID }] : []),
    ...(attachments ?? []),
  ];
  const { error } = await getClient().emails.send({
    from: FROM,
    to,
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
    ...(allAttachments.length ? { attachments: allAttachments } : {}),
  });
  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

// Escape user-supplied strings before interpolating into email HTML.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await send({
    to,
    subject: `Reset your ${BRAND_NAME} password`,
    text: renderText([
      "We received a request to reset your password.",
      "",
      `Reset it using this link (valid for 1 hour):`,
      resetUrl,
      "",
      "If you didn't request this, you can safely ignore this email.",
    ]),
    html: renderEmail({
      preheader: "Reset your password — this link is valid for 1 hour.",
      heading: "Reset your password",
      intro: "We received a request to reset the password for your account. Click the button below to choose a new one.",
      paragraphs: ["For your security, this link expires in <strong>1 hour</strong> and can only be used once."],
      cta: { label: "Reset password", url: resetUrl },
      outro:
        "If the button doesn't work, copy and paste this link into your browser:<br />" +
        `<span style="word-break:break-all;color:#4f46e5;">${esc(resetUrl)}</span><br /><br />` +
        "Didn't request a reset? You can safely ignore this email — your password won't change.",
    }),
  });
}

export async function sendNewUserNotification(input: {
  name: string;
  email: string;
  caRegistrationNumber: string;
}): Promise<void> {
  const recipients = [process.env.ADMIN_EMAIL, process.env.ADMIN2_EMAIL].filter(
    (v): v is string => !!v,
  );
  await send({
    to: recipients.length > 0 ? recipients : FROM,
    subject: `New student registered: ${input.name}`,
    text: renderText([
      "A new student account was created.",
      "",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `CA Registration Number: ${input.caRegistrationNumber}`,
    ]),
    html: renderEmail({
      preheader: `${input.name} just created a student account.`,
      heading: "New student registered",
      intro: "A new student account was just created on the platform.",
      rows: [
        { label: "Name", value: esc(input.name) },
        { label: "Email", value: esc(input.email) },
        { label: "CA Registration No.", value: esc(input.caRegistrationNumber) },
      ],
      cta: SITE_URL ? { label: "Open admin dashboard", url: `${SITE_URL}/dashboard/admin/users` } : undefined,
    }),
  });
}

export async function sendContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  await send({
    to: process.env.ADMIN_EMAIL ?? FROM,
    replyTo: input.email,
    subject: `[Contact] ${input.subject}`,
    text: renderText([
      `From: ${input.name} <${input.email}>`,
      `Subject: ${input.subject}`,
      "",
      input.message,
    ]),
    html: renderEmail({
      preheader: `New contact message from ${input.name}`,
      heading: "New contact form message",
      rows: [
        { label: "From", value: esc(input.name) },
        { label: "Email", value: esc(input.email) },
        { label: "Subject", value: esc(input.subject) },
      ],
      paragraphs: [
        `<span style="display:block;padding:14px 16px;background:#f9fafb;border:1px solid ${BRAND.border};border-radius:8px;white-space:pre-wrap;">${esc(input.message)}</span>`,
      ],
      outro: `Reply directly to this email to respond to ${esc(input.name)}.`,
    }),
  });
}

export async function sendAnswerSheetSubmittedEmails(input: {
  studentName: string;
  studentEmail: string;
  title: string;
  category: string;
}): Promise<void> {
  const adminRecipients = [process.env.ADMIN_EMAIL, process.env.ADMIN2_EMAIL].filter(
    (value): value is string => !!value,
  );
  const recipients = adminRecipients.length > 0 ? adminRecipients : FROM;

  await Promise.all([
    send({
      to: input.studentEmail,
      subject: "Answer sheet submitted for evaluation",
      text: renderText([
        `Hello ${input.studentName},`,
        "",
        "Your answer sheet has been successfully submitted for evaluation.",
        "",
        `Title: ${input.title}`,
        `Category: ${input.category}`,
        "",
        "Our team will review it and make the evaluated copy available on your dashboard once it's ready.",
      ]),
      html: renderEmail({
        preheader: "We've received your answer sheet and it's queued for evaluation.",
        heading: "Answer sheet submitted",
        intro: `Hello ${esc(input.studentName)}, your answer sheet has been received and is now in the evaluation queue.`,
        rows: [
          { label: "Title", value: esc(input.title) },
          { label: "Category", value: esc(input.category) },
        ],
        paragraphs: [
          "Our team will evaluate it and publish the marked copy to your dashboard. You'll get an email the moment it's ready.",
        ],
        cta: SITE_URL
          ? { label: "View my submissions", url: `${SITE_URL}/dashboard/student/answer-sheets` }
          : undefined,
      }),
    }),
    send({
      to: recipients,
      subject: `New answer sheet to evaluate: ${input.title}`,
      text: renderText([
        "A new answer sheet has been submitted and is ready for evaluation.",
        "",
        `Student: ${input.studentName}`,
        `Email: ${input.studentEmail}`,
        `Title: ${input.title}`,
        `Category: ${input.category}`,
      ]),
      html: renderEmail({
        preheader: `${input.studentName} submitted an answer sheet for evaluation.`,
        heading: "New answer sheet to evaluate",
        intro: "A student has submitted an answer sheet and it's ready for review.",
        rows: [
          { label: "Student", value: esc(input.studentName) },
          { label: "Email", value: esc(input.studentEmail) },
          { label: "Title", value: esc(input.title) },
          { label: "Category", value: esc(input.category) },
        ],
        cta: SITE_URL
          ? { label: "Open evaluation queue", url: `${SITE_URL}/dashboard/admin/answer-sheets` }
          : undefined,
      }),
    }),
  ]);
}

export async function sendAnswerSheetEvaluatedEmail(input: {
  studentName: string;
  studentEmail: string;
  title: string;
  category: string;
}): Promise<void> {
  await send({
    to: input.studentEmail,
    subject: "Your answer sheet has been evaluated",
    text: renderText([
      `Hello ${input.studentName},`,
      "",
      "Your answer sheet has been evaluated and the marked copy is now available.",
      "",
      `Title: ${input.title}`,
      `Category: ${input.category}`,
      "",
      "Log in and open Uploads / Evaluated Answer to view it.",
    ]),
    html: renderEmail({
      preheader: "Your evaluated answer sheet is ready to view.",
      heading: "Your answer sheet has been evaluated",
      intro: `Hello ${esc(input.studentName)}, the evaluation is complete and your marked answer sheet is ready.`,
      rows: [
        { label: "Title", value: esc(input.title) },
        { label: "Category", value: esc(input.category) },
      ],
      paragraphs: ["Open <strong>Uploads / Evaluated Answer</strong> on your dashboard to download the marked copy."],
      cta: SITE_URL
        ? { label: "View evaluated answer", url: `${SITE_URL}/dashboard/student/answer-sheets` }
        : undefined,
    }),
  });
}

export async function sendMentorshipPurchaseEmail(input: {
  studentName: string;
  studentEmail: string;
  mentorshipTitle: string;
  mentorshipDescription: string;
  category: string;
  amountPaid: string; // pre-formatted, e.g. "₹1,999"
  purchaseDate: string; // pre-formatted
  invoiceNumber: string;
  invoicePdf: Buffer;
}): Promise<void> {
  await send({
    to: input.studentEmail,
    subject: `Mentorship Purchase Confirmation — ${input.mentorshipTitle}`,
    text: renderText([
      `Hello ${input.studentName},`,
      "",
      `Your Mentorship purchase was successful.`,
      "",
      `Mentorship: ${input.mentorshipTitle}`,
      `Description: ${input.mentorshipDescription}`,
      `Category: ${input.category}`,
      `Amount paid: ${input.amountPaid}`,
      `Purchase date: ${input.purchaseDate}`,
      `Invoice number: ${input.invoiceNumber}`,
      "",
      "Your invoice is attached to this email as a PDF.",
      "",
      "Your mentor will contact/call you soon.",
    ]),
    html: renderEmail({
      preheader: `Your Mentorship purchase (${input.mentorshipTitle}) is confirmed.`,
      heading: "Mentorship purchase confirmed",
      intro: `Hello ${esc(input.studentName)}, thank you for purchasing this Mentorship. Your payment was successful.`,
      rows: [
        { label: "Mentorship", value: esc(input.mentorshipTitle) },
        { label: "Category", value: esc(input.category) },
        { label: "Amount paid", value: esc(input.amountPaid) },
        { label: "Purchase date", value: esc(input.purchaseDate) },
        { label: "Invoice number", value: esc(input.invoiceNumber) },
      ],
      paragraphs: [
        esc(input.mentorshipDescription),
        "Your invoice is attached to this email as a PDF.",
        "<strong>Your mentor will contact/call you soon.</strong>",
      ],
    }),
    attachments: [{ filename: `${input.invoiceNumber}.pdf`, content: input.invoicePdf }],
  });
}
