import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

/** Stamps `label` diagonally across every page, in memory. Never persisted to disk — see docs/HLD.md. */
export async function watermarkPdf(pdfBytes: Buffer, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = 36;
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    page.drawText(label, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.28,
      rotate: degrees(45),
    });
  }

  return doc.save();
}
