import PDFDocument from "pdfkit";

export type InvoiceData = {
  invoiceNumber: string;
  issuedAt: Date;
  buyerName: string;
  buyerEmail: string;
  itemTitle: string;
  basePrice: number; // paise
  discountAmount: number; // paise
  couponCode: string | null;
  totalAmount: number; // paise
  paymentProvider: string;
};

function formatRupees(paise: number): string {
  return `Rs. ${(paise / 100).toFixed(2)}`;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<Uint8Array>((resolve) => {
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
  });

  const companyName = process.env.INVOICE_COMPANY_NAME ?? "Decode with Shakti";

  doc.fontSize(20).text(companyName, { continued: false });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#666").text("Tax Invoice");
  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(12);
  doc.text(`Invoice Number: ${data.invoiceNumber}`);
  doc.text(`Date: ${data.issuedAt.toLocaleDateString("en-IN")}`);
  doc.moveDown(1);

  doc.text("Bill To:");
  doc.text(data.buyerName);
  doc.text(data.buyerEmail);
  doc.moveDown(1.5);

  doc.fontSize(12).text(data.itemTitle);
  doc.moveDown(0.5);

  doc.fontSize(11);
  doc.text(`Base price: ${formatRupees(data.basePrice)}`);
  if (data.discountAmount > 0) {
    doc.text(
      `Discount${data.couponCode ? ` (${data.couponCode})` : ""}: -${formatRupees(data.discountAmount)}`,
    );
  }
  doc.moveDown(0.5);
  doc.fontSize(13).text(`Total Paid: ${formatRupees(data.totalAmount)}`, { underline: true });
  doc.moveDown(1);

  doc.fontSize(10).fillColor("#666").text(`Paid via ${data.paymentProvider} provider.`);

  doc.end();
  return done;
}
