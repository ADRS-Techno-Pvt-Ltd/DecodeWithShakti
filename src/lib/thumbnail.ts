const THUMBNAIL_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

/** Returns a file extension for an accepted image MIME type, or null to reject the upload. */
export function extForThumbnailMime(mimeType: string): string | null {
  return THUMBNAIL_MIME_TO_EXT[mimeType] ?? null;
}

/**
 * `thumbnailPath` now stores the full Cloudinary CDN URL (public image, versioned so it
 * cache-busts on re-upload). This just narrows it to the DTO's `thumbnailUrl` field.
 */
export function thumbnailUrlFor(thumbnailPath: string | null): string | null {
  return thumbnailPath;
}
