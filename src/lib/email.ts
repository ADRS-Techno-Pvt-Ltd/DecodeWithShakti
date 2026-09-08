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
      subject: "Answer Sheet Submitted for Evaluation",
      text: `Hello ${input.studentName},\n\nYour answer sheet has been successfully submitted for evaluation.\n\nTitle: ${input.title}\nCategory: ${input.category}\n\nOur team will evaluate your answer sheet and make the evaluated answer sheet available once the evaluation is complete.\n\nRegards,\nDecode with Shakti`,
      html: `<p>Hello ${input.studentName},</p><p>Your answer sheet has been successfully submitted for evaluation.</p><p><strong>Title:</strong> ${input.title}<br /><strong>Category:</strong> ${input.category}</p><p>Our team will evaluate your answer sheet and make the evaluated answer sheet available once the evaluation is complete.</p><p>Regards,<br />Decode with Shakti</p>`,
    }),
    send({
      to: recipients,
      subject: "New Answer Sheet Submitted",
      text: `A new answer sheet has been submitted and is ready for evaluation.\n\nStudent: ${input.studentName}\nEmail: ${input.studentEmail}\nTitle: ${input.title}\nCategory: ${input.category}`,
      html: `<p>A new answer sheet has been submitted and is ready for evaluation.</p><p><strong>Student:</strong> ${input.studentName}<br /><strong>Email:</strong> ${input.studentEmail}<br /><strong>Title:</strong> ${input.title}<br /><strong>Category:</strong> ${input.category}</p>`,
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
    subject: "Your Answer Sheet Has Been Evaluated",
    text: `Hello ${input.studentName},\n\nYour answer sheet has been evaluated and the evaluated answer sheet is now available.\n\nTitle: ${input.title}\nCategory: ${input.category}\n\nPlease log in to the application and open Uploads / Evaluated Answer to view your evaluated answer sheet.\n\nRegards,\nDecode with Shakti`,
    html: `<p>Hello ${input.studentName},</p><p>Your answer sheet has been evaluated and the evaluated answer sheet is now available.</p><p><strong>Title:</strong> ${input.title}<br /><strong>Category:</strong> ${input.category}</p><p>Please log in to the application and open <strong>Uploads / Evaluated Answer</strong> to view your evaluated answer sheet.</p><p>Regards,<br />Decode with Shakti</p>`,
  });
}
