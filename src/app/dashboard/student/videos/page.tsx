"use client";

import { useQuery } from "@tanstack/react-query";
import { Video as VideoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/landing/reveal";
import { fetchVideos } from "@/features/videos/api";
import { VideoCard } from "@/features/videos/video-card";

export default function StudentVideosPage() {
  const { data: videos, isLoading } = useQuery({ queryKey: ["videos"], queryFn: fetchVideos });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Videos</h1>
        <p className="text-muted-foreground text-sm">Lectures and walkthroughs, free to watch.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-lg" />
          ))}
        </div>
      ) : !videos || videos.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={<VideoIcon />}
            title="No videos yet"
            description="Check back soon — new lectures will show up here."
          />
        </div>
      ) : (
        <Reveal delay={60}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
