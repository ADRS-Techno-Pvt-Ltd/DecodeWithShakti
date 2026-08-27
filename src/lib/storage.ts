import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Cloudinary folder layout:
 *   question-bank/<questionBankId>/original    (raw, authenticated) — the uploaded PDF
 *   question-bank/<questionBankId>/preview     (raw, authenticated) — the capped preview PDF
 *   question-bank/<questionBankId>/thumbnail   (image, public)       — catalog thumbnail
 *   invoices/<invoiceNumber>                   (raw, authenticated) — the generated invoice PDF
 *
 * PDFs are uploaded as `type: "authenticated"` so they are never reachable without a
 * signed URL — they are only ever streamed back through the authenticated API routes
 * under `src/app/api/v1/files/**` (which keep their session/ownership checks and, for
 * downloads, in-memory watermarking). Thumbnails are public marketing images and are
 * delivered straight from Cloudinary's CDN.
 */
const QUESTION_BANK_FOLDER = "question-bank";
const INVOICE_FOLDER = "invoices";

function uploadBuffer(
  bytes: Buffer | Uint8Array,
  options: UploadApiOptions,
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary upload returned no result"));
        return;
      }
      resolve(result);
    });
    stream.end(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
  });
}

const RAW_AUTHENTICATED = {
  resource_type: "raw",
  type: "authenticated",
  overwrite: true,
  invalidate: true,
} as const satisfies UploadApiOptions;

export async function saveOriginalFile(questionBankId: string, bytes: Buffer): Promise<string> {
  const result = await uploadBuffer(bytes, {
    ...RAW_AUTHENTICATED,
    folder: `${QUESTION_BANK_FOLDER}/${questionBankId}`,
    public_id: "original",
  });
  return result.public_id;
}

export async function savePreviewFile(questionBankId: string, bytes: Uint8Array): Promise<string> {
  const result = await uploadBuffer(bytes, {
    ...RAW_AUTHENTICATED,
    folder: `${QUESTION_BANK_FOLDER}/${questionBankId}`,
    public_id: "preview",
  });
  return result.public_id;
}

export async function saveThumbnailFile(questionBankId: string, bytes: Buffer): Promise<string> {
  const result = await uploadBuffer(bytes, {
    resource_type: "image",
    type: "upload",
    overwrite: true,
    invalidate: true,
    folder: `${QUESTION_BANK_FOLDER}/${questionBankId}`,
    public_id: "thumbnail",
  });
  return result.secure_url;
}

export async function saveInvoiceFile(invoiceNumber: string, bytes: Uint8Array): Promise<string> {
  const result = await uploadBuffer(bytes, {
    ...RAW_AUTHENTICATED,
    folder: INVOICE_FOLDER,
    public_id: invoiceNumber,
  });
  return result.public_id;
}

/**
 * Fetches an authenticated raw asset (original PDF, preview PDF or invoice PDF) by its
 * stored Cloudinary `public_id`, via a signed delivery URL. Only used server-side.
 */
export async function readStoredFile(publicId: string): Promise<Buffer> {
  const url = cloudinary.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cloudinary fetch failed (${response.status}) for ${publicId}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteQuestionBankFiles(questionBankId: string): Promise<void> {
  const prefix = `${QUESTION_BANK_FOLDER}/${questionBankId}/`;
  await Promise.all([
    cloudinary.api.delete_resources_by_prefix(prefix, {
      resource_type: "raw",
      type: "authenticated",
    }),
    cloudinary.api.delete_resources_by_prefix(prefix, {
      resource_type: "image",
      type: "upload",
    }),
  ]);
  await cloudinary.api
    .delete_folder(`${QUESTION_BANK_FOLDER}/${questionBankId}`)
    .catch(() => {
      // folder may not be empty / may already be gone — non-fatal
    });
}
