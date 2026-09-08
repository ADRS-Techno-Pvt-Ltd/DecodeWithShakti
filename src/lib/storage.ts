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
 *   answer-sheet/<submissionId>/original       (raw, authenticated) — the student's upload
 *   answer-sheet/<submissionId>/evaluated       (raw, authenticated) — the admin's evaluation
 *   answer-key/<answerKeyId>/original          (raw, authenticated) — the official answer key
 *   invoices/<invoiceNumber>                   (raw, authenticated) — the generated invoice PDF
 *
 * PDFs are uploaded as `type: "authenticated"` so they are never reachable without a
 * signed URL — they are only ever streamed back through the authenticated API routes
 * under `src/app/api/v1/files/**` (which keep their session/ownership checks and, for
 * downloads, in-memory watermarking). Thumbnails are public marketing images and are
 * delivered straight from Cloudinary's CDN.
 */
const QUESTION_BANK_FOLDER = "question-bank";
const ANSWER_SHEET_FOLDER = "answer-sheet";
const ANSWER_KEY_FOLDER = "answer-key";
const INVOICE_FOLDER = "invoices";
const VIDEO_FOLDER = "videos";
const BANNER_FOLDER = "banners";

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

export async function saveStudentAnswerSheetFile(
  submissionId: string,
  bytes: Buffer,
): Promise<string> {
  const result = await uploadBuffer(bytes, {
    ...RAW_AUTHENTICATED,
    folder: `${ANSWER_SHEET_FOLDER}/${submissionId}`,
    public_id: "original",
  });
  return result.public_id;
}

export async function saveEvaluatedAnswerSheetFile(
  submissionId: string,
  bytes: Buffer,
): Promise<string> {
  const result = await uploadBuffer(bytes, {
    ...RAW_AUTHENTICATED,
    folder: `${ANSWER_SHEET_FOLDER}/${submissionId}`,
    public_id: "evaluated",
  });
  return result.public_id;
}

export async function saveAnswerKeyFile(answerKeyId: string, bytes: Buffer): Promise<string> {
  const result = await uploadBuffer(bytes, {
    ...RAW_AUTHENTICATED,
    folder: `${ANSWER_KEY_FOLDER}/${answerKeyId}`,
    public_id: "original",
  });
  return result.public_id;
}

export async function deleteAnswerSheetFiles(submissionId: string): Promise<void> {
  const prefix = `${ANSWER_SHEET_FOLDER}/${submissionId}/`;
  await cloudinary.api.delete_resources_by_prefix(prefix, {
    resource_type: "raw",
    type: "authenticated",
  });
  await cloudinary.api.delete_folder(`${ANSWER_SHEET_FOLDER}/${submissionId}`).catch(() => {
    // The folder may already be gone.
  });
}

export async function deleteEvaluatedAnswerSheetFile(submissionId: string): Promise<void> {
  await cloudinary.api.delete_resources([`${ANSWER_SHEET_FOLDER}/${submissionId}/evaluated`], {
    resource_type: "raw",
    type: "authenticated",
  });
}

export async function deleteAnswerKeyFiles(answerKeyId: string): Promise<void> {
  const prefix = `${ANSWER_KEY_FOLDER}/${answerKeyId}/`;
  await cloudinary.api.delete_resources_by_prefix(prefix, {
    resource_type: "raw",
    type: "authenticated",
  });
  await cloudinary.api.delete_folder(`${ANSWER_KEY_FOLDER}/${answerKeyId}`).catch(() => {
    // The folder may already be gone.
  });
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

/**
 * Uploaded (non-YouTube) lecture videos. Stored `type: "authenticated"` like the PDFs —
 * never publicly reachable. Unlike PDFs, playback never buffers the file through our own
 * server (a multi-hundred-MB video in Node memory per request doesn't scale, and it loses
 * range-request seeking); instead `getSignedVideoUrl` mints a short-lived signed delivery
 * URL and the browser streams straight from Cloudinary's CDN.
 */
export async function saveVideoFile(videoId: string, bytes: Buffer): Promise<string> {
  const result = await uploadBuffer(bytes, {
    resource_type: "video",
    type: "authenticated",
    overwrite: true,
    invalidate: true,
    folder: `${VIDEO_FOLDER}/${videoId}`,
    public_id: "original",
  });
  return result.public_id;
}

export async function saveVideoThumbnailFile(videoId: string, bytes: Buffer): Promise<string> {
  const result = await uploadBuffer(bytes, {
    resource_type: "image",
    type: "upload",
    overwrite: true,
    invalidate: true,
    folder: `${VIDEO_FOLDER}/${videoId}`,
    public_id: "thumbnail",
  });
  return result.secure_url;
}

export function getSignedVideoUrl(publicId: string, expirySeconds = 60 * 15): { url: string; expiresAt: string } {
  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
  const url = cloudinary.url(publicId, {
    resource_type: "video",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
  });
  return { url, expiresAt: new Date(expiresAt * 1000).toISOString() };
}

/**
 * Same signed-delivery approach as `getSignedVideoUrl`, but with Cloudinary's `fl_attachment`
 * flag so the response carries a `Content-Disposition: attachment` header — the browser
 * downloads the file instead of streaming it inline. Still served straight from Cloudinary,
 * never buffered through our server.
 */
export function getSignedVideoDownloadUrl(publicId: string, downloadName: string, expirySeconds = 60 * 5): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
  return cloudinary.url(publicId, {
    resource_type: "video",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
    flags: `attachment:${downloadName}`,
  });
}

export async function deleteVideoFiles(videoId: string): Promise<void> {
  const prefix = `${VIDEO_FOLDER}/${videoId}/`;
  await Promise.all([
    cloudinary.api.delete_resources_by_prefix(prefix, {
      resource_type: "video",
      type: "authenticated",
    }),
    cloudinary.api.delete_resources_by_prefix(prefix, {
      resource_type: "image",
      type: "upload",
    }),
  ]);
  await cloudinary.api.delete_folder(`${VIDEO_FOLDER}/${videoId}`).catch(() => {
    // folder may not be empty / may already be gone — non-fatal
  });
}

/** Homepage carousel banner image — public, served straight from the Cloudinary CDN. */
export async function saveBannerImageFile(bannerId: string, bytes: Buffer): Promise<string> {
  const result = await uploadBuffer(bytes, {
    resource_type: "image",
    type: "upload",
    overwrite: true,
    invalidate: true,
    folder: `${BANNER_FOLDER}/${bannerId}`,
    public_id: "image",
  });
  return result.secure_url;
}

export async function deleteBannerImageFile(bannerId: string): Promise<void> {
  const prefix = `${BANNER_FOLDER}/${bannerId}/`;
  await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "image", type: "upload" });
  await cloudinary.api.delete_folder(`${BANNER_FOLDER}/${bannerId}`).catch(() => {
    // folder may not be empty / may already be gone — non-fatal
  });
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
