const THUMBNAIL_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

export function extForThumbnailMime(mimeType: string): string | null {
  return THUMBNAIL_MIME_TO_EXT[mimeType] ?? null;
}

// `?v=` cache-busts the browser/CDN cache (see the 1h Cache-Control on the thumbnail route)
// so a replaced thumbnail shows up immediately instead of the old cached image at the same URL.
export function thumbnailUrlFor(
  id: string,
  thumbnailPath: string | null,
  updatedAt: Date,
): string | null {
  return thumbnailPath ? `/api/v1/files/thumbnail/${id}?v=${updatedAt.getTime()}` : null;
}
