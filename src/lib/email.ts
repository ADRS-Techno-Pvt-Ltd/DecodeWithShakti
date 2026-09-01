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
    text: `A new student account was created.\n\nName: ${input.name}\nEmail: ${input.email}\nCA Registration Number: ${input.caRegistrationNumber}`,
    html: `<p>A new student account was created.</p><p><strong>Name:</strong> ${input.name}<br /><strong>Email:</strong> ${input.email}<br /><strong>CA Registration Number:</strong> ${input.caRegistrationNumber}</p>`,
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
