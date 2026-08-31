"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Loader2 } from "lucide-react";
import { fetchVideoStreamUrl } from "./api";
import type { Video } from "./types";

/**
 * Facade/lite-embed: shows the thumbnail with a play button and only mounts the real
 * player (YouTube iframe, or a signed Cloudinary <video>) once clicked — avoids loading
 * the YouTube iframe API (or minting a signed URL) before the student actually presses play.
 */
export function VideoPlayer({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  const isUpload = video.sourceType === "UPLOAD";
  const { data: stream, isLoading: streamLoading } = useQuery({
    queryKey: ["video-stream", video.id],
    queryFn: () => fetchVideoStreamUrl(video.id),
    enabled: playing && isUpload,
    staleTime: 10 * 60 * 1000,
  });

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-muted"
      >
        {video.thumbnailUrl && (
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
          <div className="flex size-16 items-center justify-center rounded-full bg-white/90 transition-transform group-hover:scale-105">
            <Play className="h-7 w-7 fill-current text-black" />
          </div>
        </div>
      </button>
    );
  }

  if (video.sourceType === "YOUTUBE" && video.youtubeVideoId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${video.youtubeVideoId}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  if (streamLoading || !stream) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video src={stream.url} controls autoPlay className="h-full w-full" />
    </div>
  );
}
