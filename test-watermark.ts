import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "fs";
import { watermarkPdf } from "./src/lib/watermark";

async function createTestPdf() {
  // Create a simple test PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Add 2 pages with some sample content
  for (let i = 0; i < 2; i++) {
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    // Add some sample text
    page.drawText(`Sample Question Bank - Page ${i + 1}`, {
      x: 50,
      y: height - 50,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("This is a sample question bank PDF document.", {
      x: 50,
      y: height - 100,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    
    // Add some dummy content
    const sampleText = `
Q1. What is the capital of France?
A. London
B. Paris
C. Berlin
D. Madrid

Q2. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6

Q3. Who wrote "Romeo and Juliet"?
A. Charles Dickens
B. William Shakespeare
C. Jane Austen
D. Mark Twain
    `.trim();
    
    page.drawText(sampleText, {
      x: 50,
      y: height - 150,
      size: 11,
      font,
      color: rgb(0, 0, 0),
      lineHeight: 16,
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  
  // Now apply watermark
  const testUserEmail = "user@example.com";
  console.log(`Applying watermark with email: ${testUserEmail}`);
  
  const watermarkedPdf = await watermarkPdf(Buffer.from(pdfBytes), testUserEmail);
  
  // Save both PDFs
  writeFileSync("test-original.pdf", pdfBytes);
  writeFileSync("test-watermarked.pdf", watermarkedPdf);
  
  console.log("✅ Test PDFs generated:");
  console.log("   - test-original.pdf (without watermark)");
  console.log("   - test-watermarked.pdf (with watermark)");
}

createTestPdf().catch(console.error);
