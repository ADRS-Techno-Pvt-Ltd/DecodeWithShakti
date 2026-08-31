const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts the 11-char video ID from a YouTube URL (watch, youtu.be, embed, or shorts
 * forms). Returns null for anything that doesn't resolve to a valid ID — never trust the
 * raw pasted URL as the source of truth, only the parsed ID.
 */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const vParam = url.searchParams.get("v");
    if (vParam && YOUTUBE_ID_RE.test(vParam)) return vParam;

    const match = url.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }

  return null;
}

export function youtubeThumbnailUrl(youtubeVideoId: string): string {
  return `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(youtubeVideoId: string): string {
  return `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`;
}
