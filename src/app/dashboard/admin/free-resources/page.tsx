"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Reveal } from "@/components/landing/reveal";
import { fetchAdminFreeResources, fetchCategories, fetchSubjects, deleteFreeResource } from "@/features/free-resources/api";
import type { FreeResource } from "@/features/free-resources/types";
import { FreeResourceSheet } from "./free-resource-sheet";

export default function FreeResourcesPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<FreeResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FreeResource | null>(null);

  const { data: resources, isLoading } = useQuery({
    queryKey: ["admin-free-resources"],
    queryFn: fetchAdminFreeResources,
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(resource: FreeResource) {
    setEditing(resource);
    setSheetOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFreeResource(deleteTarget.id);
      toast.success("Free resource deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-free-resources"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete free resource.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Free Resources</h1>
          <p className="text-muted-foreground text-sm">
            {resources
              ? `${resources.filter((r) => r.isPublished).length} published · ${resources.filter((r) => !r.isPublished).length} unpublished`
              : "Loading…"}
          </p>
        </div>
        <Button onClick={openCreate}>+ Upload Resource</Button>
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !resources || resources.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title="No free resources yet"
              description="Upload your first free PDF to publish it on the public Free Resources page."
              action={<Button onClick={openCreate}>+ Upload Resource</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-semibold">{resource.title}</TableCell>
                    <TableCell>{resource.category?.name ?? "—"}</TableCell>
                    <TableCell>{resource.subject?.name ?? "—"}</TableCell>
                    <TableCell>
                      {resource.isPublished ? (
                        <StatusBadge tone="success">Published</StatusBadge>
                      ) : (
                        <Badge variant="secondary">Unpublished</Badge>
                      )}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(resource)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(resource)}>
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

      <FreeResourceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        categories={categories ?? []}
        subjects={subjects ?? []}
        editing={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-free-resources"] })}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete this free resource?"
        description={
          deleteTarget ? (
            <>
              &ldquo;{deleteTarget.title}&rdquo; and its file will be permanently removed. This can&apos;t be undone.
            </>
          ) : null
        }
        confirmLabel="Delete resource"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
