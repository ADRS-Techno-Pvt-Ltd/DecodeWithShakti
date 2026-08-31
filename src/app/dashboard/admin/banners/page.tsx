"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, GalleryHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Reveal } from "@/components/landing/reveal";
import { fetchAllBanners, updateBanner, deleteBanner } from "@/features/banners/api";
import type { Banner } from "@/features/banners/types";
import { BannerSheet } from "./banner-sheet";

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const { data: banners, isLoading } = useQuery({ queryKey: ["banners", "all"], queryFn: fetchAllBanners });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["banners"] });
  }

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBanner(deleteTarget.id);
      toast.success("Banner deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete banner.");
    }
  }

  async function togglePublished(banner: Banner) {
    setBusyId(banner.id);
    try {
      await updateBanner(banner.id, { isPublished: !banner.isPublished });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update banner.");
    } finally {
      setBusyId(null);
    }
  }

  /** Swap sortOrder with the adjacent item so the carousel reorders by one slide. */
  async function move(index: number, direction: -1 | 1) {
    if (!banners) return;
    const a = banners[index];
    const b = banners[index + direction];
    if (!a || !b) return;
    setBusyId(a.id);
    try {
      await Promise.all([
        updateBanner(a.id, { sortOrder: b.sortOrder }),
        updateBanner(b.id, { sortOrder: a.sortOrder }),
      ]);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Banners</h1>
          <p className="text-muted-foreground text-sm">
            The image carousel shown at the top of the homepage, above the hero. Adjacent
            slides automatically peek in at the edges — no separate side images needed.
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Banner</Button>
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !banners || banners.length === 0 ? (
            <EmptyState
              icon={<GalleryHorizontal />}
              title="No banners yet"
              description="Upload an image to show it in the homepage carousel."
              action={<Button onClick={openCreate}>+ Add Banner</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-32">Image</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner, i) => (
                  <TableRow key={banner.id} className="align-top">
                    <TableCell className="py-3">
                      <div className="flex flex-col items-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={i === 0 || busyId !== null}
                          onClick={() => move(i, -1)}
                          aria-label="Move up"
                        >
                          <ChevronUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={i === banners.length - 1 || busyId !== null}
                          onClick={() => move(i, 1)}
                          aria-label="Move down"
                        >
                          <ChevronDown />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <img
                        src={banner.imagePath}
                        alt={banner.altText}
                        className="aspect-[21/9] w-32 rounded-md border object-cover"
                      />
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {banner.isPublished ? (
                        <StatusBadge tone="success">Published</StatusBadge>
                      ) : (
                        <StatusBadge tone="muted">Hidden</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 whitespace-normal">
                      <div className="flex flex-col items-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={busyId === banner.id}
                          onClick={() => togglePublished(banner)}
                        >
                          {banner.isPublished ? "Hide" : "Publish"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setEditing(banner);
                            setSheetOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive w-full"
                          onClick={() => setDeleteTarget(banner)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Reveal>

      <BannerSheet open={sheetOpen} onOpenChange={setSheetOpen} editing={editing} onSaved={invalidate} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete this banner?"
        description="This slide will be permanently removed from the homepage carousel. This can't be undone."
        confirmLabel="Delete banner"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
