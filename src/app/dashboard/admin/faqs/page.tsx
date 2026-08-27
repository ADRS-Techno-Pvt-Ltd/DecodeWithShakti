"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Reveal } from "@/components/landing/reveal";
import { fetchAllFaqs, updateFaq, deleteFaq, type Faq } from "@/features/faqs/api";
import { FaqSheet } from "./faq-sheet";

export default function AdminFaqsPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);

  const { data: faqs, isLoading } = useQuery({ queryKey: ["faqs", "all"], queryFn: fetchAllFaqs });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["faqs"] });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFaq(deleteTarget.id);
      toast.success("FAQ deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete FAQ.");
    }
  }

  async function togglePublished(faq: Faq) {
    setBusyId(faq.id);
    try {
      await updateFaq(faq.id, { isPublished: !faq.isPublished });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update FAQ.");
    } finally {
      setBusyId(null);
    }
  }

  /** Swap sortOrder with the adjacent item so the list reorders by one row. */
  async function move(index: number, direction: -1 | 1) {
    if (!faqs) return;
    const a = faqs[index];
    const b = faqs[index + direction];
    if (!a || !b) return;
    setBusyId(a.id);
    try {
      await Promise.all([
        updateFaq(a.id, { sortOrder: b.sortOrder }),
        updateFaq(b.id, { sortOrder: a.sortOrder }),
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
          <h1 className="font-heading text-2xl font-bold">FAQ</h1>
          <p className="text-muted-foreground text-sm">
            Questions shown in the landing page &ldquo;Before you ask in chat&rdquo; section.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          + New FAQ
        </Button>
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !faqs || faqs.length === 0 ? (
            <p className="text-muted-foreground p-8 text-center text-sm">No FAQs yet.</p>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question &amp; answer</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs.map((faq, i) => (
                  <TableRow key={faq.id} className="align-top">
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
                          disabled={i === faqs.length - 1 || busyId !== null}
                          onClick={() => move(i, 1)}
                          aria-label="Move down"
                        >
                          <ChevronDown />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 whitespace-normal">
                      <p className="font-semibold">{faq.question}</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {faq.answer}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      {faq.isPublished ? (
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
                          disabled={busyId === faq.id}
                          onClick={() => togglePublished(faq)}
                        >
                          {faq.isPublished ? "Hide" : "Publish"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setEditing(faq);
                            setSheetOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive w-full"
                          onClick={() => setDeleteTarget(faq)}
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

      <FaqSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title="Delete this FAQ?"
        description={
          deleteTarget ? (
            <>
              &ldquo;{deleteTarget.question}&rdquo; will be removed from the landing page. This
              can&apos;t be undone.
            </>
          ) : null
        }
        confirmLabel="Delete FAQ"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
