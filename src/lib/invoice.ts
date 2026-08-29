import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

/** Brand lockup used on the invoice header — see `public/logo.png` (from `Logo/`). */
const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");
const LOGO_ASPECT = 473 / 1512; // intrinsic h/w of public/logo.png

/** Palette mirrors the app design tokens in `src/app/globals.css` (light theme). */
const INK = "#1b1b2f";
const PRIMARY = "#352f9e";
const PRIMARY_DARK = "#251f73";
const MUTED = "#54546b";
const BORDER = "#e5e4f1";
const SUCCESS = "#157f4d";
const ZEBRA = "#f4f3fb";
const WHITE = "#ffffff";

export type InvoiceData = {
  invoiceNumber: string;
  issuedAt: Date;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  itemTitle: string;
  basePrice: number; // paise
  discountAmount: number; // paise
  couponCode: string | null;
  totalAmount: number; // paise
  paymentProvider: string;
  orderId: string;
  transactionId: string | null;
  paymentMethod: string | null;
};

function formatRupees(paise: number): string {
  return `Rs. ${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: Date): string {
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  net_banking: "Net Banking",
  netbanking: "Net Banking",
  wallet: "Wallet",
  paylater: "Pay Later",
  cardless_emi: "Cardless EMI",
  emi: "EMI",
  mock: "Test Payment",
  free: "Coupon (100% off)",
};

function formatPaymentMethod(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<Uint8Array>((resolve) => {
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
  });

  const companyName = process.env.INVOICE_COMPANY_NAME ?? "Decode with Shakti";
  const companyAddress = process.env.INVOICE_COMPANY_ADDRESS ?? null;
  const companyEmail = process.env.INVOICE_COMPANY_EMAIL ?? null;
  const companyGstin = process.env.INVOICE_COMPANY_GSTIN ?? null;
  const companyWebsite = process.env.INVOICE_COMPANY_WEBSITE ?? null;

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;

  // --- top accent bar (full bleed) ---
  doc.rect(0, 0, doc.page.width, 6).fill(PRIMARY);

  // --- header: brand lockup (left) + invoice heading (right) ---
  let brandBottom = 50;
  const logoWidth = 190;
  if (existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, left, 46, { width: logoWidth });
      brandBottom = 46 + logoWidth * LOGO_ASPECT;
    } catch {
      doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text(companyName, left, 50);
      brandBottom = 82;
    }
  } else {
    doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text(companyName, left, 50);
    brandBottom = 82;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor(PRIMARY_DARK)
    .text("TAX INVOICE", left, 50, { width: contentWidth, align: "right", characterSpacing: 1 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(MUTED)
    .text(data.invoiceNumber, left, 80, { width: contentWidth, align: "right" })
    .text(`Issued ${formatDate(data.issuedAt)}`, left, 94, { width: contentWidth, align: "right" });

  let y = Math.max(brandBottom, 110) + 24;

  doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor(BORDER).stroke();
  y += 22;

  // --- billed to / from (two columns) ---
  const colGap = 24;
  const colW = (contentWidth - colGap) / 2;
  const rightColX = left + colW + colGap;

  function partyBlock(x: number, startY: number, label: string, lines: string[]): number {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(MUTED)
      .text(label.toUpperCase(), x, startY, { width: colW, characterSpacing: 1 });
    let ly = startY + 15;
    lines.filter(Boolean).forEach((line, i) => {
      doc
        .font(i === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(i === 0 ? 11 : 9.5)
        .fillColor(i === 0 ? INK : MUTED)
        .text(line, x, ly, { width: colW });
      ly = doc.y + 3;
    });
    return ly;
  }

  const fromLines = [companyName];
  if (companyGstin) fromLines.push(`GSTIN: ${companyGstin}`);
  if (companyAddress) fromLines.push(companyAddress);
  if (companyEmail) fromLines.push(companyEmail);
  if (companyWebsite) fromLines.push(companyWebsite);

  const billedToLines = [data.buyerName, data.buyerEmail];
  if (data.buyerPhone) billedToLines.push(data.buyerPhone);
  const billedBottom = partyBlock(left, y, "Billed To", billedToLines);
  const fromBottom = partyBlock(rightColX, y, "From", fromLines);
  y = Math.max(billedBottom, fromBottom) + 20;

  // --- payment details (order id / transaction id / method / date) ---
  const detailsPadY = 12;
  const detailsPadX = 14;
  const detailRows: [string, string][] = [
    ["Order ID", data.orderId],
    ["Transaction ID", data.transactionId ?? "—"],
    ["Payment Method", formatPaymentMethod(data.paymentMethod)],
    ["Payment Date", formatDateTime(data.issuedAt)],
  ];
  const detailColW = (contentWidth - detailsPadX * 2) / 2;
  const detailRowH = 30;
  const detailsBoxH = detailsPadY * 2 + Math.ceil(detailRows.length / 2) * detailRowH;

  doc.rect(left, y, contentWidth, detailsBoxH).fill(ZEBRA);
  detailRows.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const dx = left + detailsPadX + col * detailColW;
    const dy = y + detailsPadY + row * detailRowH;
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(label.toUpperCase(), dx, dy, { width: detailColW - detailsPadX, characterSpacing: 0.5 });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(INK)
      .text(value, dx, dy + 11, { width: detailColW - detailsPadX });
  });
  y += detailsBoxH + 20;

  // --- line items table ---
  const cellPad = 12;
  const descX = left + cellPad;
  const amtColW = 120;
  const amtColX = right - amtColW - cellPad;
  const qtyColW = 44;
  const qtyColX = amtColX - qtyColW - cellPad;
  const descColW = qtyColX - descX - cellPad;

  doc.rect(left, y, contentWidth, 24).fill(PRIMARY);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(WHITE);
  doc.text("DESCRIPTION", descX, y + 8, { width: descColW, characterSpacing: 0.5 });
  doc.text("QTY", qtyColX, y + 8, { width: qtyColW, align: "right", characterSpacing: 0.5 });
  doc.text("AMOUNT", amtColX, y + 8, { width: amtColW, align: "right", characterSpacing: 0.5 });
  y += 24;

  doc.font("Helvetica").fontSize(10);
  const descHeight = doc.heightOfString(data.itemTitle, { width: descColW });
  const rowHeight = Math.max(descHeight + 16, 30);
  doc.rect(left, y, contentWidth, rowHeight).fill(ZEBRA);
  doc.fillColor(INK).font("Helvetica").fontSize(10).text(data.itemTitle, descX, y + 8, { width: descColW });
  doc.fillColor(MUTED).text("1", qtyColX, y + 8, { width: qtyColW, align: "right" });
  doc
    .fillColor(INK)
    .text(formatRupees(data.basePrice), amtColX, y + 8, { width: amtColW, align: "right" });
  y += rowHeight;

  doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor(BORDER).stroke();
  y += 20;

  // --- PAID badge (left) + totals (right) ---
  const summaryTop = y;
  doc.roundedRect(left, summaryTop, 78, 26, 4).fill(SUCCESS);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(WHITE)
    .text("PAID", left, summaryTop + 8, { width: 78, align: "center", characterSpacing: 1 });

  const sumW = 250;
  const sumX = right - sumW;
  const sumHalf = sumW / 2;

  function summaryRow(
    label: string,
    value: string,
    opts: { bold?: boolean; size?: number; color?: string } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.bold ? "Helvetica-Bold" : "Helvetica";
    doc.font(font).fontSize(size).fillColor(opts.color ?? MUTED).text(label, sumX, y, { width: sumHalf });
    doc
      .font(font)
      .fontSize(size)
      .fillColor(opts.color ?? INK)
      .text(value, sumX + sumHalf, y, { width: sumHalf, align: "right" });
    y = doc.y + 7;
  }

  summaryRow("Subtotal", formatRupees(data.basePrice));
  if (data.discountAmount > 0) {
    summaryRow(
      `Discount${data.couponCode ? ` (${data.couponCode})` : ""}`,
      `-${formatRupees(data.discountAmount)}`,
      { color: SUCCESS },
    );
  }
  y += 2;
  doc.moveTo(sumX, y).lineTo(right, y).lineWidth(1).strokeColor(BORDER).stroke();
  y += 12;
  summaryRow("Total Paid", formatRupees(data.totalAmount), {
    bold: true,
    size: 13,
    color: PRIMARY_DARK,
  });

  // --- footer (pinned near page bottom) ---
  const footerY = doc.page.height - doc.page.margins.bottom - 68;
  doc.moveTo(left, footerY).lineTo(right, footerY).lineWidth(1).strokeColor(BORDER).stroke();
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(
      data.paymentProvider === "free"
        ? "This order was fully covered by a coupon — no payment was collected."
        : `Processed via ${data.paymentProvider.replace(/\b\w/g, (c) => c.toUpperCase())} Payment Gateway.`,
      left,
      footerY + 12,
      { width: contentWidth },
    );
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(INK)
    .text("Thank you for your purchase.", left, footerY + 28, { width: contentWidth });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      "This is a computer-generated invoice and does not require a signature.",
      left,
      footerY + 44,
      { width: contentWidth },
    );

  doc.end();
  return done;
}
