export type VideoSource = "YOUTUBE" | "UPLOAD";

export type Video = {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  sourceType: VideoSource;
  youtubeVideoId: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
};
