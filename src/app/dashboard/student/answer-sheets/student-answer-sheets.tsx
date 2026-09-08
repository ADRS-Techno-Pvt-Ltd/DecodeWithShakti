"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Download, FileCheck2, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export function StudentAnswerSheets({ series }: { series: Series[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);

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
      <div className="grid gap-4 lg:grid-cols-2">
        {series.map((item) => {
          const isOpen = openId === item.questionBank.id;
          const hasSubmission = item.submission !== null;
          return (
            <Card key={item.questionBank.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{item.questionBank.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{item.questionBank.category.name}</p>
                  </div>
                  {hasSubmission ? (
                    <StatusBadge tone="success"><CheckCircle2 /> Answer Submitted</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">Answer Not Submitted</StatusBadge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" render={<a href={`/api/v1/files/download/${item.purchaseId}`}><Download /> Download Question Bank</a>} />
                <Button variant="ghost" size="sm" onClick={() => setOpenId(isOpen ? null : item.questionBank.id)}>
                  {isOpen ? "Hide Test Series" : "Open Test Series"}
                </Button>
                {isOpen && (
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">{item.questionBank.description}</p>
                    {!hasSubmission ? (
                      <div className="space-y-2">
                        <Input type="file" accept="application/pdf,.pdf" onChange={(event) => setFiles({ ...files, [item.questionBank.id]: event.target.files?.[0] ?? null })} />
                        <div className="flex gap-2">
                          <Button onClick={() => void uploadAnswer(item.questionBank.id)} disabled={uploading === item.questionBank.id}>
                            {uploading === item.questionBank.id ? <Loader2 className="animate-spin" /> : <Upload />} Upload Answer
                          </Button>
                          <Button variant="outline" onClick={() => setOpenId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {item.submission && <Button variant="outline" size="sm" render={<a href={`/api/v1/files/answer-sheets/${item.submission.id}`} target="_blank" rel="noreferrer"><FileText /> View My Answer</a>} />}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.submission?.status === "EVALUATED" && <Button size="sm" render={<a href={`/api/v1/files/answer-sheets/${item.submission.id}/evaluated`} target="_blank" rel="noreferrer"><FileCheck2 /> View Evaluated Answer</a>} />}
                      {item.answerKey && <Button variant="outline" size="sm" render={<a href={`/api/v1/files/answer-keys/${item.answerKey.id}`} target="_blank" rel="noreferrer"><FileCheck2 /> Download Answer Key</a>} />}
                    </div>
                    {hasSubmission && !item.answerKey && <p className="text-sm text-muted-foreground">Answer Key is not available yet.</p>}
                    {item.submission?.status === "PENDING_EVALUATION" && <StatusBadge tone="warning">Evaluation Pending ...</StatusBadge>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
