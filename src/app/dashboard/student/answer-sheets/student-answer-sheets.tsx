"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Download, FileCheck2, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";

type Series = {
  purchaseId: string;
  questionBank: {
    id: string;
    title: string;
    slug: string;
    description: string;
    category: { id: string; name: string; slug: string };
    files: { id: string; fileName: string }[];
    legacyDownloadAvailable: boolean;
  };
  submission: {
    id: string;
    status: "PENDING_EVALUATION" | "EVALUATED";
    submittedAt: string;
    evaluatedAt: string | null;
    files: {
      id: string;
      studentFileName: string;
      evaluatedFileName: string | null;
      status: "PENDING_EVALUATION" | "EVALUATED";
    }[];
  } | null;
  answerKeys: { id: string; title: string; fileName: string; questionBankFileId: string | null }[];
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Pairs each row with its answer key: a key linked to a paper goes to that paper; keys with no
 * link (older uploads) fill the remaining rows in upload order.
 */
function assignAnswerKeys(papers: { id: string }[], keys: Series["answerKeys"], rowCount: number) {
  const linked = new Map(keys.filter((k) => k.questionBankFileId).map((k) => [k.questionBankFileId, k]));
  const queue = keys.filter((k) => !k.questionBankFileId || !papers.some((p) => p.id === k.questionBankFileId));
  return Array.from({ length: rowCount }, (_, index) => {
    const paper = papers[index];
    return (paper && linked.get(paper.id)) ?? null;
  }).map((key) => key ?? queue.shift() ?? null);
}

function statusBadge(item: Series) {
  if (!item.submission) return <StatusBadge tone="warning">Answer Not Submitted</StatusBadge>;
  if (item.submission.status === "EVALUATED") return <StatusBadge tone="success"><CheckCircle2 /> Evaluated</StatusBadge>;
  return <StatusBadge tone="warning">Evaluation Pending</StatusBadge>;
}

export function StudentAnswerSheets({ series }: { series: Series[] }) {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const active = series.find((item) => item.questionBank.id === detailId) ?? null;

  async function uploadAnswer(questionBankId: string) {
    const selected = files[questionBankId];
    if (!selected || selected.length === 0) {
      toast.error("Choose at least one answer sheet PDF first.");
      return;
    }
    setUploading(questionBankId);
    const formData = new FormData();
    formData.set("questionBankId", questionBankId);
    selected.forEach((file) => formData.append("file", file));
    const response = await fetch("/api/v1/answer-sheets", { method: "POST", body: formData });
    const body = await response.json().catch(() => null);
    setUploading(null);
    if (!response.ok) {
      toast.error(typeof body?.error === "string" ? body.error : "Could not upload answer sheet.");
      return;
    }
    toast.success("Answer submitted.");
    setFiles({ ...files, [questionBankId]: [] });
    setInputKey((key) => key + 1);
    router.refresh();
  }

  async function uploadMoreAnswers(submissionId: string, questionBankId: string) {
    const selected = files[questionBankId];
    if (!selected || selected.length === 0) {
      toast.error("Choose at least one answer sheet PDF first.");
      return;
    }
    setUploading(questionBankId);
    const formData = new FormData();
    selected.forEach((file) => formData.append("file", file));
    const response = await fetch(`/api/v1/answer-sheets/${submissionId}/files`, {
      method: "POST",
      body: formData,
    });
    const body = await response.json().catch(() => null);
    setUploading(null);
    if (!response.ok) {
      toast.error(typeof body?.error === "string" ? body.error : "Could not upload answer sheet.");
      return;
    }
    toast.success("Answer submitted.");
    setFiles({ ...files, [questionBankId]: [] });
    setInputKey((key) => key + 1);
    router.refresh();
  }

  if (series.length === 0) {
    return (
      <EmptyState
        icon={<FileCheck2 />}
        title="No purchased Test Series"
        description="Purchase a Test Series to upload your answer and view its evaluation."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Uploads / Evaluated Answer</h1>
        <p className="text-sm text-muted-foreground">Submit answers for your purchased Test Series.</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Test Series</TableHead>
                <TableHead className="whitespace-nowrap">Category</TableHead>
                <TableHead className="whitespace-nowrap">Submitted On</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((item) => (
                <TableRow key={item.questionBank.id}>
                  <TableCell>
                    <div className="font-semibold whitespace-nowrap">{item.questionBank.title}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {item.questionBank.category.name}
                  </TableCell>
                  <TableCell suppressHydrationWarning className="whitespace-nowrap text-muted-foreground">
                    {formatDate(item.submission?.submittedAt ?? null)}
                  </TableCell>
                  <TableCell>{statusBadge(item)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {item.questionBank.legacyDownloadAvailable && (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <a href={`/api/v1/files/download/${item.purchaseId}`} className="gap-1.5">
                              <Download className="h-3.5 w-3.5" />
                              Test Series
                            </a>
                          }
                        />
                      )}
                      {item.questionBank.files.map((paper, index) => (
                        <Button
                          key={paper.id}
                          variant="outline"
                          size="sm"
                          render={
                            <a href={`/api/v1/files/question-bank-papers/${paper.id}`} className="gap-1.5">
                              <Download className="h-3.5 w-3.5" />
                              {item.questionBank.files.length > 1 ? `Paper ${index + 1}` : "Test Series"}
                            </a>
                          }
                        />
                      ))}
                      <Button size="sm" onClick={() => setDetailId(item.questionBank.id)}>
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.questionBank.title}</DialogTitle>
                <DialogDescription>{active.questionBank.category.name}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{statusBadge(active)}</dd>
                  <dt className="text-muted-foreground">Submitted on</dt>
                  <dd suppressHydrationWarning>{formatDate(active.submission?.submittedAt ?? null)}</dd>
                  <dt className="text-muted-foreground">Evaluated on</dt>
                  <dd suppressHydrationWarning>{formatDate(active.submission?.evaluatedAt ?? null)}</dd>
                </dl>

                {active.questionBank.description && (
                  <p className="text-sm text-muted-foreground">{active.questionBank.description}</p>
                )}

                <div className="space-y-3 rounded-md border p-4">
                  <div className="space-y-2.5">
                    {(() => {
                      const rowCount = Math.max(
                        active.questionBank.files.length,
                        active.submission?.files.length ?? 0,
                        active.answerKeys.length,
                      );
                      const rowKeys = assignAnswerKeys(active.questionBank.files, active.answerKeys, rowCount);
                      return Array.from({ length: rowCount }).map((_, index, rows) => ({ index, rows, key: rowKeys[index] }));
                    })().map(({ index, rows, key: answerKey }) => {
                      const paper = active.questionBank.files[index] ?? null;
                      const submittedFile = active.submission?.files[index] ?? null;
                      const label = rows.length > 1 ? `Paper ${index + 1}` : "Question Paper";
                      return (
                        <div key={paper?.id ?? submittedFile?.id ?? answerKey?.id ?? index} className="rounded-md border p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{label}</span>
                            {!submittedFile ? (
                              <StatusBadge tone="muted">Not submitted</StatusBadge>
                            ) : submittedFile.status === "EVALUATED" ? (
                              <StatusBadge tone="success">
                                <CheckCircle2 /> Evaluated
                              </StatusBadge>
                            ) : (
                              <StatusBadge tone="warning">Evaluation Pending</StatusBadge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {(paper || (index === 0 && active.questionBank.legacyDownloadAvailable)) && (
                              <Button
                                variant="outline"
                                size="sm"
                                render={
                                  <a
                                    href={
                                      paper
                                        ? `/api/v1/files/question-bank-papers/${paper.id}`
                                        : `/api/v1/files/download/${active.purchaseId}`
                                    }
                                  >
                                    <Download /> Question Paper
                                  </a>
                                }
                              />
                            )}
                            {submittedFile && (
                              <Button
                                variant="outline"
                                size="sm"
                                render={
                                  <a
                                    href={`/api/v1/files/answer-sheets/${submittedFile.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <FileText /> My Answer
                                  </a>
                                }
                              />
                            )}
                            {submittedFile?.status === "EVALUATED" && (
                              <Button
                                size="sm"
                                render={
                                  <a
                                    href={`/api/v1/files/answer-sheets/${submittedFile.id}/evaluated`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <FileCheck2 /> Evaluated Copy
                                  </a>
                                }
                              />
                            )}
                            {answerKey ? (
                              <Button
                                variant="outline"
                                size="sm"
                                render={
                                  <a
                                    href={`/api/v1/files/answer-keys/${answerKey.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <FileCheck2 /> Answer Key
                                  </a>
                                }
                              />
                            ) : (
                              submittedFile && (
                                <span className="text-muted-foreground text-xs">Answer key not available yet</span>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!active.submission ? (
                    <div className="space-y-2">
                      <Input
                        key={inputKey}
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        onChange={(event) =>
                          setFiles({
                            ...files,
                            [active.questionBank.id]: Array.from(event.target.files ?? []),
                          })
                        }
                      />
                      <p className="text-muted-foreground text-xs">
                        Select one or more PDFs — each is kept as its own separately evaluated paper. You cannot add or replace papers after submitting, so double-check your selection first.
                      </p>
                      <Button
                        onClick={() => void uploadAnswer(active.questionBank.id)}
                        disabled={uploading === active.questionBank.id}
                      >
                        {uploading === active.questionBank.id ? <Loader2 className="animate-spin" /> : <Upload />} Upload Answer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {active.submission.files.length < active.questionBank.files.length && (
                        <div className="space-y-2 border-t pt-3">
                          <p className="text-muted-foreground text-xs">
                            You&apos;ve submitted {active.submission.files.length} of {active.questionBank.files.length} papers.
                            Add the rest whenever you&apos;re ready.
                          </p>
                          <Input
                            key={inputKey}
                            type="file"
                            accept="application/pdf,.pdf"
                            multiple
                            onChange={(event) =>
                              setFiles({
                                ...files,
                                [active.questionBank.id]: Array.from(event.target.files ?? []),
                              })
                            }
                          />
                          <Button
                            onClick={() => void uploadMoreAnswers(active.submission!.id, active.questionBank.id)}
                            disabled={uploading === active.questionBank.id}
                          >
                            {uploading === active.questionBank.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Upload />
                            )}{" "}
                            Upload More Papers
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
