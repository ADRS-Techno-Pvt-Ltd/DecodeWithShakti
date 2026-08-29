import { PDFDocument, PDFRawStream, StandardFonts, rgb, degrees, grayscale } from "pdf-lib";
import { inflateSync } from "zlib";
import { readFileSync } from "fs";
import path from "path";

/**
 * Every call to this module draws its stamp into its own isolated content stream
 * shaped like `q ... 0.55 0.55 0.55 rg ... <45-degree rotation matrix> ... Tj ... Q`
 * (pdf-lib's drawText appends a new stream rather than merging into existing ones).
 * If a question bank's stored file was ever re-uploaded after already passing through
 * here once (e.g. a downloaded, watermarked copy mistaken for the original), stamping
 * again would stack watermarks. Detect and drop any stream matching our own signature
 * before adding a fresh one, so a download only ever shows the current user's mark.
 */
const OWN_WATERMARK_SIGNATURE =
  /0\.55 0\.55 0\.55 rg[\s\S]{0,80}?0\.70710678\d* 0\.70710678\d* -0\.70710678\d* 0\.70710678\d*[\s\S]{0,80}?Tj/;

function stripOwnWatermarks(doc: PDFDocument): void {
  for (const page of doc.getPages()) {
    const contents = page.node.normalizedEntries().Contents;
    if (!contents) continue;

    for (let i = contents.size() - 1; i >= 0; i--) {
      const stream = doc.context.lookup(contents.get(i));
      if (!(stream instanceof PDFRawStream)) continue;

      let text: string;
      try {
        text = inflateSync(Buffer.from(stream.getContents())).toString("latin1");
      } catch {
        text = Buffer.from(stream.getContents()).toString("latin1");
      }

      if (OWN_WATERMARK_SIGNATURE.test(text)) {
        contents.remove(i);
      }
    }
  }
}

/** Stamps logo and user email diagonally across every page in a repeating pattern, in memory. Never persisted to disk — see docs/HLD.md. */
export async function watermarkPdf(pdfBytes: Buffer, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  stripOwnWatermarks(doc);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Load and embed the logo
  const logoPath = path.join(process.cwd(), "Logo", "watermarklogo.png");
  const logoImageBytes = readFileSync(logoPath);
  const logoImage = await doc.embedPng(logoImageBytes);
  const logoDims = logoImage.scale(0.15); // Scale down the logo

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    
    const userEmail = label; // This is the current user's email passed as 'label'
    const emailSize = 10;
    
    // Spacing between watermark instances
    const spacingX = 280;
    const spacingY = 200;
    
    // Calculate how many watermarks we need to cover the page
    const diagonal = Math.sqrt(width * width + height * height);
    const numX = Math.ceil(diagonal / spacingX) + 2;
    const numY = Math.ceil(diagonal / spacingY) + 2;
    
    // Draw watermarks in a grid pattern
    for (let i = -1; i < numX; i++) {
      for (let j = -1; j < numY; j++) {
        const baseX = i * spacingX;
        const baseY = j * spacingY;
        
        // Draw logo image in grayscale
        page.drawImage(logoImage, {
          x: baseX,
          y: baseY,
          width: logoDims.width,
          height: logoDims.height,
          rotate: degrees(-45),
          opacity: 0.2,
          color: grayscale(0.5), // Make logo grayscale
        });
        
        // Calculate email width to center it below the logo
        const emailWidth = fontBold.widthOfTextAtSize(userEmail, emailSize);
        const logoCenter = baseX + (logoDims.width / 2);
        const emailX = logoCenter - (emailWidth / 2);
        
        // Position email below the logo with minimal gap
        const emailY = baseY - logoDims.height - 1; // Reduced gap to 1 point
        
        // User email watermark centered below the logo (bold)
        page.drawText(userEmail, {
          x: emailX,
          y: emailY,
          size: emailSize,
          font: fontBold,
          color: grayscale(0.5), // Gray color
          opacity: 0.3,
          rotate: degrees(-45),
        });
      }
    }
  }

  return doc.save();
}
