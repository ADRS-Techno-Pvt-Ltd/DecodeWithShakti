import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFile } from "fs/promises";
import { watermarkPdf } from "./src/lib/watermark";

async function main() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 1; p <= 2; p++) {
    const page = doc.addPage([595, 842]); // A4
    page.drawText("CA Foundation - Paper 2", { x: 50, y: 790, size: 12, font: bold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText("Business Laws - 600 Question Bank", { x: 50, y: 770, size: 18, font: bold });
    page.drawText(`Page ${p}`, { x: 500, y: 790, size: 12, font });

    const lines = [
      "Q1. Which of the following is an essential element of a valid contract?",
      "    (a) Offer and acceptance   (b) Free consent",
      "    (c) Lawful consideration   (d) All of the above",
      "",
      "Q2. A minor's agreement is:",
      "    (a) Voidable   (b) Void ab initio",
      "    (c) Valid   (d) Illegal",
      "",
      "Q3. Under the Indian Partnership Act, 1932, the maximum number of",
      "    partners in a partnership firm is governed by the:",
      "    (a) Partnership Act   (b) Companies Act",
      "    (c) LLP Act   (d) SEBI regulations",
    ];
    lines.forEach((line, i) => {
      page.drawText(line, { x: 50, y: 720 - i * 22, size: 12, font, color: rgb(0.15, 0.15, 0.15) });
    });
  }

  const bytes = Buffer.from(await doc.save());
  const watermarked1 = await watermarkPdf(bytes, "rahul.k@email.com");
  await writeFile("scratch-sample-watermarked.pdf", watermarked1);

  const watermarked2 = await watermarkPdf(Buffer.from(watermarked1), "rahul.k@email.com");
  await writeFile("scratch-sample-watermarked-redo.pdf", watermarked2);

  console.log("sizes:", watermarked1.length, watermarked2.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
