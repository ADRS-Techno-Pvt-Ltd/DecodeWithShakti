"use client";

import { useState } from "react";
import { CheckCircle2, FileCheck2, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { answerSheetCategoryLabel } from "@/features/answer-sheets/constants";

type SubmissionFile = {
  id: string;
  studentFileName: string;
  evaluatedFileName: string | null;
  status: "PENDING_EVALUATION" | "EVALUATED";
};

type Submission = {
  id: string;
  title: string;
  description: string;
  submittedAt: string;
  questionBank: { id: string; title: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  student: { id: string; name: string; email: string };
  files: SubmissionFile[];
};

function overallStatus(files: SubmissionFile[]): "PENDING_EVALUATION" | "EVALUATED" {
  return files.length > 0 && files.every((f) => f.status === "EVALUATED") ? "EVALUATED" : "PENDING_EVALUATION";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: "PENDING_EVALUATION" | "EVALUATED") {
  return status === "EVALUATED" ? (
    <StatusBadge tone="success">Evaluated</StatusBadge>
  ) : (
    <StatusBadge tone="warning">Pending Evaluation</StatusBadge>
  );
}

export function AdminAnswerSheets({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const active = submissions.find((item) => item.id === detailId) ?? null;

  async function evaluate(fileId: string) {
    const file = pendingFiles[fileId];
    if (!file) return toast.error("Choose the evaluated PDF first.");
    setSaving(fileId);
    const data = new FormData();
    data.set("file", file);
    const response = await fetch(`/api/v1/answer-sheets/files/${fileId}`, { method: "PATCH", body: data });
    const body = await response.json().catch(() => null);
    setSaving(null);
    if (!response.ok) return toast.error(typeof body?.error === "string" ? body.error : "Evaluation upload failed.");
    setSubmissions((current) =>
      current.map((submission) => ({
        ...submission,
        files: submission.files.map((f) => (f.id === fileId ? { ...f, ...body } : f)),
      })),
    );
    toast.success("Evaluated paper published.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Submitted Answer Sheets</h1>
        <p className="text-sm text-muted-foreground">Review student submissions and upload evaluated PDFs.</p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No answer sheets submitted yet.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Student</TableHead>
                  <TableHead className="whitespace-nowrap">Test Series</TableHead>
                  <TableHead className="whitespace-nowrap">Category</TableHead>
                  <TableHead className="whitespace-nowrap">Submitted</TableHead>
                  <TableHead className="whitespace-nowrap">Papers</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="font-semibold whitespace-nowrap">{submission.student.name}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {submission.questionBank?.title ?? "Legacy submission"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {answerSheetCategoryLabel(submission.category.slug, submission.category.name)}
                    </TableCell>
                    <TableCell suppressHydrationWarning className="whitespace-nowrap text-muted-foreground">
                      {new Date(submission.submittedAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {submission.files.filter((f) => f.status === "EVALUATED").length}/{submission.files.length}
                    </TableCell>
                    <TableCell>{statusBadge(overallStatus(submission.files))}</TableCell>
                    <TableCell>
                      <div className="flex justify-end whitespace-nowrap">
                        <Button size="sm" onClick={() => setDetailId(submission.id)}>
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
      )}

      <Dialog open={active !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.title}</DialogTitle>
                <DialogDescription>
                  {answerSheetCategoryLabel(active.category.slug, active.category.name)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{statusBadge(overallStatus(active.files))}</dd>
                  <dt className="text-muted-foreground">Student</dt>
                  <dd className="break-all">{active.student.name} · {active.student.email}</dd>
                  <dt className="text-muted-foreground">Test Series</dt>
                  <dd className="break-all">{active.questionBank?.title ?? "Legacy submission"}</dd>
                  <dt className="text-muted-foreground">Submitted on</dt>
                  <dd suppressHydrationWarning>{formatDate(active.submittedAt)}</dd>
                </dl>

                {active.description && (
                  <p className="text-sm text-muted-foreground">{active.description}</p>
                )}

                <div className="space-y-3">
                  {active.files.map((file, index) => (
                    <div key={file.id} className="space-y-3 rounded-md border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {active.files.length > 1 ? `Paper ${index + 1} — ` : ""}
                          {file.studentFileName}
                        </span>
                        {statusBadge(file.status)}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <a href={`/api/v1/files/answer-sheets/${file.id}`} target="_blank" rel="noreferrer">
                              <FileText /> View Answer
                            </a>
                          }
                        />
                        {file.status === "EVALUATED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            render={
                              <a
                                href={`/api/v1/files/answer-sheets/${file.id}/evaluated`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <FileCheck2 /> View Evaluation
                              </a>
                            }
                          />
                        )}
                      </div>

                      {file.status === "EVALUATED" ? (
                        <p className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Evaluation published
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(event) =>
                              setPendingFiles({ ...pendingFiles, [file.id]: event.target.files?.[0] ?? null })
                            }
                          />
                          <Button
                            size="sm"
                            onClick={() => void evaluate(file.id)}
                            disabled={saving === file.id}
                          >
                            {saving === file.id ? <Loader2 className="animate-spin" /> : <Upload />} Upload Evaluated Paper
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
