import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@example.com",
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
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@example.com",
    to: process.env.ADMIN_EMAIL,
    replyTo: input.email,
    subject: `[Contact] ${input.subject}`,
    text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
    html: `<p><strong>From:</strong> ${input.name} &lt;${input.email}&gt;</p><p>${input.message.replace(/\n/g, "<br />")}</p>`,
  });
}
