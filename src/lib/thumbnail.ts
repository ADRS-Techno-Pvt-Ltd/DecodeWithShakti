const THUMBNAIL_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

export function extForThumbnailMime(mimeType: string): string | null {
  return THUMBNAIL_MIME_TO_EXT[mimeType] ?? null;
}

export function thumbnailUrlFor(id: string, thumbnailPath: string | null): string | null {
  return thumbnailPath ? `/api/v1/files/thumbnail/${id}` : null;
}
