"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Reveal } from "@/components/landing/reveal";
import { fetchAllCategories, deleteCategory, type Category } from "@/features/categories/api";
import { CategorySheet } from "./category-sheet";

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchAllCategories,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      toast.success("Category deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete category.");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground text-sm">
            Manage question bank categories.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          + New Category
        </Button>
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !categories || categories.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="No categories yet"
              description="Create your first category to organize question banks."
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setSheetOpen(true);
                  }}
                >
                  + New Category
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-32 text-center">Question Banks</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category: any) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                    <TableCell className="text-center">{category._count?.questionBanks || 0}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(category);
                            setSheetOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(category)}
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

      <CategorySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete this category?"
        description={
          deleteTarget ? (
            <>
              &ldquo;{deleteTarget.name}&rdquo; will be permanently deleted. This action cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete Category"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
