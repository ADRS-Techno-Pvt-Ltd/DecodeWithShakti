import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

const FROM = process.env.EMAIL_FROM ?? "no-reply@example.com";

type SendInput = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

async function send({ to, subject, text, html, replyTo }: SendInput): Promise<void> {
  const { error } = await getClient().emails.send({
    from: FROM,
    to,
    subject,
    text,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await send({
    to,
    subject: "Reset your password",
    text: `Reset your password using this link (valid for 1 hour): ${resetUrl}`,
    html: `<p>Reset your password using the link below (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
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
    text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
    html: `<p><strong>From:</strong> ${input.name} &lt;${input.email}&gt;</p><p>${input.message.replace(/\n/g, "<br />")}</p>`,
  });
}
