"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Reveal } from "@/components/landing/reveal";
import { fetchAdminQuestionBanks, fetchCategories, deleteQuestionBank } from "@/features/question-banks/api";
import type { QuestionBank } from "@/features/question-banks/types";
import { QuestionBankSheet } from "./question-bank-sheet";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export default function AdminQuestionBanksPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBank | null>(null);

  const { data: banks, isLoading } = useQuery({
    queryKey: ["admin-question-banks"],
    queryFn: fetchAdminQuestionBanks,
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(bank: QuestionBank) {
    setEditing(bank);
    setSheetOpen(true);
  }

  async function handleDelete(bank: QuestionBank) {
    if (!confirm(`Delete "${bank.title}"? This cannot be undone.`)) return;
    try {
      await deleteQuestionBank(bank.id);
      toast.success("Question bank deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-question-banks"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete question bank.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Question Banks</h1>
          <p className="text-muted-foreground text-sm">
            {banks ? `${banks.filter((b) => b.isPublished).length} published · ${banks.filter((b) => !b.isPublished).length} unpublished` : "Loading…"}
          </p>
        </div>
        <Button onClick={openCreate}>+ Upload Question Bank</Button>
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !banks || banks.length === 0 ? (
            <p className="text-muted-foreground p-8 text-center text-sm">
              No question banks yet — click &ldquo;Upload Question Bank&rdquo; to add your first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.map((bank) => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-semibold">{bank.title}</TableCell>
                    <TableCell>{bank.category.name}</TableCell>
                    <TableCell>
                      {formatRupees(bank.price)}
                      {bank.earlyBirdPrice != null && (
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          ({formatRupees(bank.earlyBirdPrice)} early bird)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {bank.previewEnabled ? (
                        <StatusBadge tone="success">On · {bank.previewPageCount} pages</StatusBadge>
                      ) : (
                        <Badge variant="secondary">Off</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {bank.isPublished ? (
                        <StatusBadge tone="success">Published</StatusBadge>
                      ) : (
                        <Badge variant="secondary">Unpublished</Badge>
                      )}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(bank)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(bank)}>
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

      <QuestionBankSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        categories={categories ?? []}
        editing={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-question-banks"] })}
      />
    </div>
  );
}
