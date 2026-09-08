"use client";

import { useState } from "react";
import { CheckCircle2, FileCheck2, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { answerSheetCategoryLabel } from "@/features/answer-sheets/constants";

type Submission = {
  id: string;
  title: string;
  description: string;
  status: "PENDING_EVALUATION" | "EVALUATED";
  submittedAt: string;
  evaluatedAt: string | null;
  studentFileName: string;
  evaluatedFileName: string | null;
  questionBank: { id: string; title: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  student: { id: string; name: string; email: string };
};

export function AdminAnswerSheets({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function evaluate(submission: Submission) {
    const file = files[submission.id];
    if (!file) return toast.error("Choose the evaluated PDF first.");
    setSaving(submission.id);
    const data = new FormData();
    data.set("file", file);
    const response = await fetch(`/api/v1/answer-sheets/${submission.id}`, { method: "PATCH", body: data });
    const body = await response.json().catch(() => null);
    setSaving(null);
    if (!response.ok) return toast.error(typeof body?.error === "string" ? body.error : "Evaluation upload failed.");
    setSubmissions((current) => current.map((item) => (item.id === submission.id ? body : item)));
    toast.success("Evaluated answer sheet published.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Submitted Answer Sheets</h1>
        <p className="text-sm text-muted-foreground">Review student submissions and upload evaluated PDFs.</p>
      </div>
      {submissions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No answer sheets submitted yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <CardTitle className="text-base">{submission.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{submission.student.name} · {submission.student.email}</p>
                    <p className="text-sm text-muted-foreground">Test Series: {submission.questionBank?.title ?? "Legacy submission"}</p>
                    <p className="text-sm text-muted-foreground">{answerSheetCategoryLabel(submission.category.slug, submission.category.name)} · {new Date(submission.submittedAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  {submission.status === "EVALUATED" ? <StatusBadge tone="success">Evaluated</StatusBadge> : <StatusBadge tone="warning">Pending Evaluation</StatusBadge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{submission.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" render={<a href={`/api/v1/files/answer-sheets/${submission.id}`} target="_blank" rel="noreferrer"><FileText /> View Answer Sheet</a>} />
                  {submission.status === "EVALUATED" ? (
                    <Button variant="outline" size="sm" render={<a href={`/api/v1/files/answer-sheets/${submission.id}/evaluated`} target="_blank" rel="noreferrer"><FileCheck2 /> View Evaluation</a>} />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input className="h-8 max-w-[220px] text-xs" type="file" accept="application/pdf,.pdf" onChange={(event) => setFiles({ ...files, [submission.id]: event.target.files?.[0] ?? null })} />
                      <Button size="sm" className="px-2.5 text-xs" onClick={() => void evaluate(submission)} disabled={saving === submission.id}>{saving === submission.id ? <Loader2 className="animate-spin" /> : <Upload />} Upload Evaluated Answer Sheet</Button>
                    </div>
                  )}
                </div>
                {submission.status === "EVALUATED" && <p className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Evaluation published</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
