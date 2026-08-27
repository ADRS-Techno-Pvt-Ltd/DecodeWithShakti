import { PDFDocument, PDFRawStream, StandardFonts, rgb, degrees } from "pdf-lib";
import { inflateSync } from "zlib";

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

/** Stamps `label` diagonally across every page, in memory. Never persisted to disk — see docs/HLD.md. */
export async function watermarkPdf(pdfBytes: Buffer, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  stripOwnWatermarks(doc);
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
