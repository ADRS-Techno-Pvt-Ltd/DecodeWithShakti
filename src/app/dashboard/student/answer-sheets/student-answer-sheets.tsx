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
    fileName: string;
    category: { id: string; name: string; slug: string };
  };
  submission: {
    id: string;
    status: "PENDING_EVALUATION" | "EVALUATED";
    studentFileName: string;
    evaluatedFileName: string | null;
    submittedAt: string;
    evaluatedAt: string | null;
  } | null;
  answerKey: { id: string; title: string; fileName: string } | null;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(item: Series) {
  if (!item.submission) return <StatusBadge tone="warning">Answer Not Submitted</StatusBadge>;
  if (item.submission.status === "EVALUATED") return <StatusBadge tone="success"><CheckCircle2 /> Evaluated</StatusBadge>;
  return <StatusBadge tone="warning">Evaluation Pending</StatusBadge>;
}

export function StudentAnswerSheets({ series }: { series: Series[] }) {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const active = series.find((item) => item.questionBank.id === detailId) ?? null;

  async function uploadAnswer(questionBankId: string) {
    const file = files[questionBankId];
    if (!file) {
      toast.error("Choose an answer sheet PDF first.");
      return;
    }
    setUploading(questionBankId);
    const formData = new FormData();
    formData.set("questionBankId", questionBankId);
    formData.set("file", file);
    const response = await fetch("/api/v1/answer-sheets", { method: "POST", body: formData });
    const body = await response.json().catch(() => null);
    setUploading(null);
    if (!response.ok) {
      toast.error(typeof body?.error === "string" ? body.error : "Could not upload answer sheet.");
      return;
    }
    toast.success("Answer submitted.");
    setFiles({ ...files, [questionBankId]: null });
    router.refresh();
  }

  if (series.length === 0) {
    return (
      <EmptyState
        icon={<FileCheck2 />}
        title="No purchased Test Series"
        description="Purchase a Question Bank to upload your answer and view its evaluation."
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
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a href={`/api/v1/files/download/${item.purchaseId}`} className="gap-1.5">
                            <Download className="h-3.5 w-3.5" /> Question Bank
                          </a>
                        }
                      />
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
                  <dt className="text-muted-foreground">File name</dt>
                  <dd className="break-all">{active.questionBank.fileName}</dd>
                  <dt className="text-muted-foreground">Submitted on</dt>
                  <dd suppressHydrationWarning>{formatDate(active.submission?.submittedAt ?? null)}</dd>
                  <dt className="text-muted-foreground">Evaluated on</dt>
                  <dd suppressHydrationWarning>{formatDate(active.submission?.evaluatedAt ?? null)}</dd>
                  {active.submission?.studentFileName && (
                    <>
                      <dt className="text-muted-foreground">Your answer</dt>
                      <dd className="break-all">{active.submission.studentFileName}</dd>
                    </>
                  )}
                  {active.submission?.evaluatedFileName && (
                    <>
                      <dt className="text-muted-foreground">Evaluated file</dt>
                      <dd className="break-all">{active.submission.evaluatedFileName}</dd>
                    </>
                  )}
                </dl>

                {active.questionBank.description && (
                  <p className="text-sm text-muted-foreground">{active.questionBank.description}</p>
                )}

                <div className="space-y-3 rounded-md border p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a href={`/api/v1/files/download/${active.purchaseId}`}>
                        <Download /> Download Question Bank
                      </a>
                    }
                  />

                  {!active.submission ? (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) =>
                          setFiles({ ...files, [active.questionBank.id]: event.target.files?.[0] ?? null })
                        }
                      />
                      <Button
                        onClick={() => void uploadAnswer(active.questionBank.id)}
                        disabled={uploading === active.questionBank.id}
                      >
                        {uploading === active.questionBank.id ? <Loader2 className="animate-spin" /> : <Upload />} Upload Answer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a
                            href={`/api/v1/files/answer-sheets/${active.submission.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <FileText /> View My Answer
                          </a>
                        }
                      />
                      {active.submission.status === "EVALUATED" && (
                        <Button
                          size="sm"
                          render={
                            <a
                              href={`/api/v1/files/answer-sheets/${active.submission.id}/evaluated`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileCheck2 /> View Evaluated Answer
                            </a>
                          }
                        />
                      )}
                      {active.answerKey && (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <a
                              href={`/api/v1/files/answer-keys/${active.answerKey.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileCheck2 /> Download Answer Key
                            </a>
                          }
                        />
                      )}
                    </div>
                  )}

                  {active.submission && !active.answerKey && (
                    <p className="text-sm text-muted-foreground">Answer Key is not available yet.</p>
                  )}
                  {active.submission?.status === "PENDING_EVALUATION" && (
                    <StatusBadge tone="warning">Evaluation Pending ...</StatusBadge>
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
