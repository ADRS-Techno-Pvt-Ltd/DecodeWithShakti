import { PDFDocument } from "pdf-lib";

export async function getPageCount(pdfBytes: Buffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPageCount();
}

/**
 * Concatenates several PDFs into one, in the order given. Used when an admin
 * uploads multiple PDFs for a single question bank / test series — everything
 * downstream (preview, watermark, download) still works with one stored file.
 */
export async function mergePdfs(parts: Buffer[]): Promise<Buffer> {
  if (parts.length === 1) return parts[0];

  const merged = await PDFDocument.create();
  for (const part of parts) {
    const src = await PDFDocument.load(part);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return Buffer.from(await merged.save());
}

/** Builds a truncated copy of the PDF containing only the first `pageCount` pages. */
export async function buildPreview(pdfBytes: Buffer, pageCount: number): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();
  const cappedCount = Math.min(pageCount, totalPages);

  const previewDoc = await PDFDocument.create();
  const indices = Array.from({ length: cappedCount }, (_, i) => i);
  const copiedPages = await previewDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((page) => previewDoc.addPage(page));

  return previewDoc.save();
}
