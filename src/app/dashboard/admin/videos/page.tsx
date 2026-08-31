"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Video as VideoIcon, Link2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Reveal } from "@/components/landing/reveal";
import { fetchAdminVideos, deleteVideo } from "@/features/videos/api";
import { fetchCategories } from "@/features/question-banks/api";
import type { Video } from "@/features/videos/types";
import { VideoSheet } from "./video-sheet";

export default function AdminVideosPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);

  const { data: videos, isLoading } = useQuery({
    queryKey: ["admin-videos"],
    queryFn: fetchAdminVideos,
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(video: Video) {
    setEditing(video);
    setSheetOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteVideo(deleteTarget.id);
      toast.success("Video deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete video.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Videos</h1>
          <p className="text-muted-foreground text-sm">
            {videos ? `${videos.filter((v) => v.isPublished).length} published · ${videos.filter((v) => !v.isPublished).length} unpublished` : "Loading…"}
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Video</Button>
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !videos || videos.length === 0 ? (
            <EmptyState
              icon={<VideoIcon />}
              title="No videos yet"
              description="Add a YouTube link or upload a file to publish your first video."
              action={<Button onClick={openCreate}>+ Add Video</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="font-semibold">{video.title}</TableCell>
                    <TableCell>{video.category?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1.5">
                        {video.sourceType === "YOUTUBE" ? (
                          <Link2 className="h-3.5 w-3.5" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {video.sourceType === "YOUTUBE" ? "YouTube" : "Upload"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {video.isPublished ? (
                          <StatusBadge tone="success">Published</StatusBadge>
                        ) : (
                          <Badge variant="secondary">Unpublished</Badge>
                        )}
                        {video.isFeatured && <Badge variant="outline">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(video)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(video)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Reveal>

      <VideoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        categories={categories ?? []}
        editing={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-videos"] })}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete this video?"
        description={
          deleteTarget ? (
            <>&ldquo;{deleteTarget.title}&rdquo; will be permanently removed. This can&apos;t be undone.</>
          ) : null
        }
        confirmLabel="Delete video"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
