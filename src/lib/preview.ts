import { PDFDocument } from "pdf-lib";

export async function getPageCount(pdfBytes: Buffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPageCount();
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
