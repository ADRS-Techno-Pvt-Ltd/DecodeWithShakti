"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Reveal } from "@/components/landing/reveal";
import { fetchAllSubjects, deleteSubject, type Subject } from "@/features/subjects/api";
import { SubjectSheet } from "./subject-sheet";

export default function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchAllSubjects,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSubject(deleteTarget.id);
      toast.success("Subject deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete subject.");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Subjects</h1>
          <p className="text-muted-foreground text-sm">
            Manage subjects used to tag question banks and test series.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          + New Subject
        </Button>
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !subjects || subjects.length === 0 ? (
            <EmptyState
              icon={<Library />}
              title="No subjects yet"
              description="Create your first subject to tag question banks and test series."
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setSheetOpen(true);
                  }}
                >
                  + New Subject
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-32 text-center">Products</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell className="text-muted-foreground">{subject.slug}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {subject.category?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">{subject._count?.questionBanks ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(subject);
                            setSheetOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(subject)}
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

      <SubjectSheet open={sheetOpen} onOpenChange={setSheetOpen} editing={editing} onSaved={invalidate} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete this subject?"
        description={
          deleteTarget ? (
            <>
              &ldquo;{deleteTarget.name}&rdquo; will be permanently deleted. This action cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete Subject"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
