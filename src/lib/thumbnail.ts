import { youtubeThumbnailUrl } from "@/lib/youtube";

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

/** Static fallback used wherever a catalog item (video, etc.) has no thumbnail of its own. */
export const DEFAULT_VIDEO_THUMBNAIL = "/video-placeholder.svg";

/**
 * A video's thumbnail resolves in priority order: an admin-uploaded custom image always
 * wins (lets branding override YouTube's own thumbnail too), then YouTube's auto thumbnail
 * for YOUTUBE-sourced videos, then the static default so the UI never has to special-case
 * a missing thumbnail itself.
 */
export function videoThumbnailUrlFor(thumbnailPath: string | null, youtubeVideoId: string | null): string {
  if (thumbnailPath) return thumbnailPath;
  if (youtubeVideoId) return youtubeThumbnailUrl(youtubeVideoId);
  return DEFAULT_VIDEO_THUMBNAIL;
}
