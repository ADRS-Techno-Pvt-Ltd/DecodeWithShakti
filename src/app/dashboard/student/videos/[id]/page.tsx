"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchVideo } from "@/features/videos/api";
import { VideoPlayer } from "@/features/videos/video-player";

export default function StudentVideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: video, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: () => fetchVideo(id),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-4" render={<Link href="/dashboard/student/videos"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Videos</Link>} />

      {isLoading || !video ? (
        <div className="space-y-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : (
        <>
          <VideoPlayer video={video} />
          <div className="mt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {video.category && <Badge variant="secondary">{video.category.name}</Badge>}
                <h1 className="font-heading mt-2 text-xl font-bold">{video.title}</h1>
              </div>
              {video.sourceType === "UPLOAD" ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a href={`/api/v1/videos/${video.id}/download`}>
                      <Download className="mr-1.5 h-4 w-4" />
                      Download
                    </a>
                  }
                />
              ) : (
                video.youtubeVideoId && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        Watch on YouTube
                      </a>
                    }
                  />
                )
              )}
            </div>
            <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">{video.description}</p>
          </div>
        </>
      )}
    </div>
  );
}
