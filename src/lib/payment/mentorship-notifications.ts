import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import { sendMentorshipPurchaseEmail } from "@/lib/email";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

/**
 * Post-purchase side effect specific to Mentorship: a confirmation email to
 * the student, with the invoice PDF attached. Called once, after a
 * Mentorship purchase's Invoice row exists (see finalizePurchase). Must
 * never throw — a failure here must never invalidate an already-successful
 * payment.
 *
 * Admin notification is no longer sent server-side here — it's now a
 * student-initiated WhatsApp Click-to-Chat action on the purchase success
 * page (see src/app/purchase/[orderId]/return/whatsapp-notify-mentor.tsx),
 * which needs no API credentials.
 */
export async function sendMentorshipPurchaseNotifications(purchaseId: string): Promise<void> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { user: true, questionBank: { include: { category: true } }, invoice: true },
  });

  if (!purchase || purchase.questionBank.type !== "MENTORSHIP" || !purchase.invoice) {
    return;
  }

  try {
    const invoicePdf = await readStoredFile(purchase.invoice.filePath);
    await sendMentorshipPurchaseEmail({
      studentName: purchase.user.name,
      studentEmail: purchase.user.email,
      mentorshipTitle: purchase.questionBank.title,
      mentorshipDescription: purchase.questionBank.description,
      category: purchase.questionBank.category.name,
      amountPaid: formatRupees(purchase.amount),
      purchaseDate: purchase.createdAt.toLocaleDateString("en-IN"),
      invoiceNumber: purchase.invoice.invoiceNumber,
      invoicePdf,
    });
  } catch (err) {
    console.error(`Mentorship purchase email failed for purchase ${purchaseId}:`, err);
  }
}
