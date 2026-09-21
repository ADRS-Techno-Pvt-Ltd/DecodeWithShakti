"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AnswerKeySummary,
  Category,
  ProductType,
  QuestionBank,
  QuestionBankFileSummary,
  Subject,
} from "@/features/question-banks/types";
import {
  createQuestionBank,
  updateQuestionBank,
  replaceQuestionBankThumbnail,
  replaceQuestionBankFile,
  addQuestionBankAnswerKeys,
  setAnswerKeyPaper,
  deleteAnswerKey,
  replaceAnswerKey,
  addQuestionBankFiles,
  replaceQuestionBankFilePaper,
  deleteQuestionBankFilePaper,
} from "@/features/question-banks/api";

type FormValues = {
  title: string;
  type: ProductType;
  description: string;
  categoryId: string;
  subjectId: string;
  price: string;
  previewEnabled: boolean;
  previewPageCount: string;
  earlyBirdEnabled: boolean;
  earlyBirdPrice: string;
  earlyBirdEndsAt: string;
  isPublished: boolean;
  isFeatured: boolean;
  features: { value: string }[];
  file: FileList | null;
  thumbnail: FileList | null;
  answerKey: FileList | null;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

function paiseToRupees(paise: number): string {
  return String(paise / 100);
}

function rupeesToPaise(rupees: string): number {
  return Math.round(Number(rupees) * 100);
}

export function QuestionBankSheet({
  open,
  onOpenChange,
  categories,
  subjects,
  editing,
  onSaved,
  mode = "question-banks",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  subjects: Subject[];
  editing: QuestionBank | null;
  onSaved: () => void;
  mode?: "question-banks" | "test-series" | "mentorship";
}) {
  const isTestSeries = mode === "test-series";
  const isMentorship = mode === "mentorship";
  const [submitting, setSubmitting] = useState(false);
  const [answerKeys, setAnswerKeys] = useState<AnswerKeySummary[]>([]);
  const [deletingAnswerKeyId, setDeletingAnswerKeyId] = useState<string | null>(null);
  const [replacingAnswerKeyId, setReplacingAnswerKeyId] = useState<string | null>(null);
  const [papers, setPapers] = useState<QuestionBankFileSummary[]>([]);
  const [deletingPaperId, setDeletingPaperId] = useState<string | null>(null);
  const [paperToDelete, setPaperToDelete] = useState<QuestionBankFileSummary | null>(null);
  const [replacingPaperId, setReplacingPaperId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      type: "QUESTION_BANK",
      description: "",
      categoryId: "",
      subjectId: "",
      price: "",
      previewEnabled: false,
      previewPageCount: "",
      earlyBirdEnabled: false,
      earlyBirdPrice: "",
      earlyBirdEndsAt: "",
      isPublished: true,
      isFeatured: false,
      features: [],
      file: null,
      thumbnail: null,
      answerKey: null,
    },
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features",
  });

  useEffect(() => {
    setAnswerKeys(editing?.answerKeys ?? []);
    setPapers(editing?.files ?? []);
  }, [editing, open]);

  async function handleDeleteAnswerKey(answerKeyId: string) {
    setDeletingAnswerKeyId(answerKeyId);
    try {
      await deleteAnswerKey(answerKeyId);
      setAnswerKeys((prev) => prev.filter((k) => k.id !== answerKeyId));
      toast.success("Answer key removed.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove answer key.");
    } finally {
      setDeletingAnswerKeyId(null);
    }
  }

  async function handleReplaceAnswerKey(answerKeyId: string, file: File) {
    setReplacingAnswerKeyId(answerKeyId);
    try {
      const updated = await replaceAnswerKey(answerKeyId, file);
      setAnswerKeys((prev) => prev.map((k) => (k.id === answerKeyId ? { ...k, ...updated } : k)));
      toast.success("Answer key replaced.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not replace answer key.");
    } finally {
      setReplacingAnswerKeyId(null);
    }
  }

  async function handleAnswerKeyPaper(answerKeyId: string, paperId: string) {
    const previous = answerKeys;
    setAnswerKeys((prev) =>
      prev.map((k) => (k.id === answerKeyId ? { ...k, questionBankFileId: paperId || null } : k)),
    );
    try {
      await setAnswerKeyPaper(answerKeyId, paperId || null);
      toast.success("Answer key linked.");
      onSaved();
    } catch (err) {
      setAnswerKeys(previous);
      toast.error(err instanceof Error ? err.message : "Could not link answer key.");
    }
  }

  async function handleDeletePaper(fileId: string) {
    if (!editing) return;
    setDeletingPaperId(fileId);
    try {
      await deleteQuestionBankFilePaper(editing.id, fileId);
      setPapers((prev) => prev.filter((p) => p.id !== fileId));
      setAnswerKeys((prev) => prev.filter((k) => k.questionBankFileId !== fileId));
      toast.success("Paper removed, along with its answer key.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove paper.");
    } finally {
      setDeletingPaperId(null);
    }
  }

  async function handleReplacePaper(fileId: string, file: File) {
    if (!editing) return;
    setReplacingPaperId(fileId);
    try {
      const updated = await replaceQuestionBankFilePaper(editing.id, fileId, file);
      setPapers((prev) => prev.map((p) => (p.id === fileId ? updated : p)));
      toast.success("Paper replaced.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not replace paper.");
    } finally {
      setReplacingPaperId(null);
    }
  }

  useEffect(() => {
    if (editing) {
      reset({
        title: editing.title,
        type: editing.type,
        description: editing.description,
        categoryId: editing.categoryId,
        subjectId: editing.subjectId ?? "",
        price: paiseToRupees(editing.price),
        previewEnabled: editing.previewEnabled,
        previewPageCount: editing.previewPageCount ? String(editing.previewPageCount) : "",
        earlyBirdEnabled: editing.earlyBirdPrice != null,
        earlyBirdPrice: editing.earlyBirdPrice ? paiseToRupees(editing.earlyBirdPrice) : "",
        earlyBirdEndsAt: toDatetimeLocal(editing.earlyBirdEndsAt),
        isPublished: editing.isPublished,
        isFeatured: editing.isFeatured,
        features: (editing.features ?? []).map((value) => ({ value })),
        file: null,
        thumbnail: null,
        answerKey: null,
      });
    } else {
      reset({
        title: "",
        type: isMentorship ? "MENTORSHIP" : isTestSeries ? "TEST_SERIES" : "QUESTION_BANK",
        description: "",
        categoryId: categories[0]?.id ?? "",
        subjectId: "",
        price: "",
        previewEnabled: false,
        previewPageCount: "",
        earlyBirdEnabled: false,
        earlyBirdPrice: "",
        earlyBirdEndsAt: "",
        isPublished: true,
        isFeatured: false,
        features: [],
        file: null,
        thumbnail: null,
      });
    }
  }, [editing, categories, reset, open, isTestSeries, isMentorship]);

  const previewEnabled = watch("previewEnabled");
  const productType = watch("type");
  const earlyBirdEnabled = watch("earlyBirdEnabled");
  const thumbnailFile = watch("thumbnail");

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  useEffect(() => {
    const file = thumbnailFile?.[0];
    if (!file) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const thumbnailUploading = submitting && !!thumbnailFile && thumbnailFile.length > 0;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const features = values.features
      .map((f) => f.value.trim())
      .filter((v) => v.length > 0);
    try {
      if (editing) {
        await updateQuestionBank(editing.id, {
          title: values.title,
          type: isMentorship ? "MENTORSHIP" : values.type,
          description: values.description,
          categoryId: values.categoryId,
          subjectId: values.subjectId ? values.subjectId : null,
          price: rupeesToPaise(values.price),
          previewEnabled: isMentorship ? false : values.previewEnabled,
          previewPageCount: isMentorship ? undefined : values.previewEnabled ? Number(values.previewPageCount) : undefined,
          earlyBirdPrice: values.earlyBirdEnabled ? rupeesToPaise(values.earlyBirdPrice) : undefined,
          earlyBirdEndsAt: values.earlyBirdEnabled
            ? new Date(values.earlyBirdEndsAt).toISOString()
            : undefined,
          isPublished: values.isPublished,
          isFeatured: values.isFeatured,
          features,
        });
        if (values.thumbnail && values.thumbnail.length > 0) {
          await replaceQuestionBankThumbnail(editing.id, values.thumbnail[0]);
        }
        if (!isMentorship && values.file && values.file.length > 0) {
          if (isTestSeries) {
            const added = await addQuestionBankFiles(editing.id, Array.from(values.file));
            setPapers((prev) => [...prev, ...added]);
          } else {
            await replaceQuestionBankFile(editing.id, Array.from(values.file));
          }
        }
        if (!isMentorship && values.answerKey && values.answerKey.length > 0) {
          await addQuestionBankAnswerKeys(editing.id, Array.from(values.answerKey));
        }
        toast.success("Question bank updated.");
      } else {
        if (!isMentorship && (!values.file || values.file.length === 0)) {
          toast.error("Please choose a PDF file.");
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.set("title", values.title);
        formData.set("type", isMentorship ? "MENTORSHIP" : values.type);
        formData.set("description", values.description);
        formData.set("categoryId", values.categoryId);
        if (values.subjectId) formData.set("subjectId", values.subjectId);
        formData.set("price", String(rupeesToPaise(values.price)));
        formData.set("previewEnabled", String(isMentorship ? false : values.previewEnabled));
        if (!isMentorship && values.previewEnabled) formData.set("previewPageCount", values.previewPageCount);
        if (values.earlyBirdEnabled) {
          formData.set("earlyBirdPrice", String(rupeesToPaise(values.earlyBirdPrice)));
          formData.set("earlyBirdEndsAt", new Date(values.earlyBirdEndsAt).toISOString());
        }
        formData.set("isPublished", String(values.isPublished));
        formData.set("isFeatured", String(values.isFeatured));
        formData.set("features", JSON.stringify(features));
        // Multiple PDFs are merged server-side into one stored file, in the order listed.
        if (!isMentorship) Array.from(values.file ?? []).forEach((file) => formData.append("file", file));
        if (!isMentorship) {
          Array.from(values.answerKey ?? []).forEach((file) => formData.append("answerKey", file));
        }
        if (values.thumbnail && values.thumbnail.length > 0) {
          formData.set("thumbnail", values.thumbnail[0]);
        }
        await createQuestionBank(formData);
        toast.success(isMentorship ? "Mentor uploaded successfully." : "Question bank uploaded.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Dialog
      open={open}
      // Only close via the ✕ button, the Cancel button, or a successful save —
      // ignore backdrop clicks, Escape, and focus-out so a half-filled form isn't lost.
      onOpenChange={(next, details) => {
        if (!next && details?.reason !== "close-press" && details?.reason !== "imperative-action") {
          return;
        }
        onOpenChange(next);
      }}
      disablePointerDismissal
    >
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{editing ? (isMentorship ? "Edit Mentorship" : isTestSeries ? "Edit Test Series" : "Edit Question Bank") : (isMentorship ? "Upload Mentor" : isTestSeries ? "Create Test Series" : "Upload Question Bank")}</DialogTitle>
          <DialogDescription>{isMentorship ? "Mentorship product details" : "PDF only"}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title", { required: true })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={productType} onValueChange={(value) => !isMentorship && setValue("type", value as ProductType)} disabled={isMentorship}>
              <SelectTrigger className="w-full">
                <SelectValue>{productType === "MENTORSHIP" ? "Mentorship" : productType === "TEST_SERIES" ? "Test Series" : "Question Bank"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {!isMentorship && <SelectItem value="QUESTION_BANK">Question Bank</SelectItem>}
                {!isMentorship && <SelectItem value="TEST_SERIES">Test Series</SelectItem>}
                {isMentorship && <SelectItem value="MENTORSHIP">Mentorship</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className={isMentorship ? "flex flex-col gap-3" : "grid grid-cols-2 gap-3"}>
            {!isMentorship && <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select
                value={watch("categoryId")}
                onValueChange={(v) => {
                  const next = v ?? "";
                  setValue("categoryId", next);
                  // Drop the selected subject if it no longer belongs to this category.
                  const current = watch("subjectId");
                  if (
                    current &&
                    !subjects.some(
                      (s) => s.id === current && (s.categoryId === next || s.categoryId == null),
                    )
                  ) {
                    setValue("subjectId", "");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category">
                    {(value) =>
                      categories.find((c) => c.id === value)?.name ?? "Select category"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price (₹)</Label>
              {isMentorship ? (
                <Input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  {...register("price", { required: true })}
                />
              ) : (
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("price", { required: true })}
                />
              )}
            </div>
          </div>

          {!isMentorship && <div className="flex flex-col gap-1.5">
            <Label>Subject (optional)</Label>
            <Select
              value={watch("subjectId") || "none"}
              onValueChange={(v) => setValue("subjectId", !v || v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No subject">
                  {(value) =>
                    subjects.find((s) => s.id === value)?.name ?? "No subject"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No subject</SelectItem>
                {subjects
                  .filter(
                    (s) => s.categoryId == null || s.categoryId === watch("categoryId"),
                  )
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">
              Only subjects for the selected category are shown.
            </span>
          </div>}

          {!isMentorship && !isTestSeries && <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">
              Question Bank File (PDF) {editing ? "(replace)" : ""}
            </Label>
            <input
              id="file"
              type="file"
              accept="application/pdf"
              multiple
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              {...register("file")}
            />
            <span className="text-muted-foreground text-xs">
              {editing
                ? "Leave empty to keep the current file. Select one or more PDFs to replace it — multiple files are merged into a single document in the order listed, and the preview is regenerated."
                : "Select one or more PDFs. Multiple files are merged into a single document in the order listed."}
            </span>
          </div>}

          {!isMentorship && isTestSeries && <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">Test Series Papers (PDF)</Label>
            {papers.length > 0 && (
              <ul className="flex flex-col gap-1.5 rounded-md border p-2">
                {papers.map((paper) => (
                  <li key={paper.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{paper.fileName}</span>
                    <div className="flex items-center gap-1">
                      <label className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline underline-offset-2">
                        {replacingPaperId === paper.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Replace"
                        )}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          disabled={replacingPaperId === paper.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) void handleReplacePaper(paper.id, file);
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove paper"
                        disabled={deletingPaperId === paper.id}
                        onClick={() => setPaperToDelete(paper)}
                      >
                        {deletingPaperId === paper.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <input
              id="file"
              type="file"
              accept="application/pdf"
              multiple
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              {...register("file")}
            />
            <span className="text-muted-foreground text-xs">
              {editing
                ? "Select one or more PDFs to add as new papers — existing papers above are kept as-is; use Replace or the trash icon to change one."
                : "Select one or more PDFs. Each is kept as its own separately downloadable paper — they are not merged."}
            </span>
          </div>}

          {!isMentorship && <div className="flex flex-col gap-1.5">
            <Label htmlFor="answerKey">Answer key / solutions PDF (optional)</Label>
            {answerKeys.length > 0 && (
              <ul className="flex flex-col gap-1.5 rounded-md border p-2">
                {answerKeys.map((key) => (
                  <li key={key.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{key.fileName}</span>
                    <div className="flex items-center gap-1">
                      {isTestSeries && papers.length > 0 && (
                        <select
                          aria-label="Paper this answer key belongs to"
                          className="h-7 max-w-40 rounded-md border border-input bg-transparent px-1.5 text-xs"
                          value={key.questionBankFileId ?? ""}
                          onChange={(event) => void handleAnswerKeyPaper(key.id, event.target.value)}
                        >
                          <option value="">Auto (by order)</option>
                          {papers.map((paper, index) => (
                            <option key={paper.id} value={paper.id}>
                              Paper {index + 1} — {paper.fileName}
                            </option>
                          ))}
                        </select>
                      )}
                      <label className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline underline-offset-2">
                        {replacingAnswerKeyId === key.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Replace"
                        )}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          disabled={replacingAnswerKeyId === key.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) void handleReplaceAnswerKey(key.id, file);
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove answer key"
                        disabled={deletingAnswerKeyId === key.id}
                        onClick={() => void handleDeleteAnswerKey(key.id)}
                      >
                        {deletingAnswerKeyId === key.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <input
              id="answerKey"
              type="file"
              accept="application/pdf"
              multiple
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              {...register("answerKey")}
            />
            <span className="text-muted-foreground text-xs">
              Select one or more PDFs — each is kept as a separate, individually downloadable file (e.g. one per paper).{" "}
              {productType === "TEST_SERIES"
                ? "Unlocked for a student only after they submit their answer sheet."
                : "Available to students to download immediately after purchase."}
            </span>
          </div>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thumbnail">
              Thumbnail {editing ? "(replace)" : "(optional)"} — shown to students while browsing
            </Label>
            {(thumbnailPreview ?? editing?.thumbnailUrl) && (
              <div className="relative aspect-video w-48 bg-muted">
                <img
                  src={thumbnailPreview ?? editing?.thumbnailUrl ?? undefined}
                  alt=""
                  className="h-full w-full rounded-md border object-contain"
                />
                {thumbnailUploading && (
                  <div className="bg-background/70 absolute inset-0 flex items-center justify-center rounded-md">
                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
            )}
            <Input
              id="thumbnail"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              {...register("thumbnail")}
            />
            {thumbnailUploading && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading thumbnail…
              </span>
            )}
          </div>

          {!isMentorship && <div className="rounded-lg border p-3.5">
            <div className="flex items-center gap-2.5">
              <Switch
                checked={previewEnabled}
                onCheckedChange={(v) => setValue("previewEnabled", v)}
              />
              <span className="text-sm font-medium">Enable preview</span>
            </div>
            {previewEnabled && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                <Label htmlFor="previewPageCount">Preview page count</Label>
                <Input
                  id="previewPageCount"
                  type="number"
                  {...register("previewPageCount", {
                    validate: (v) =>
                      !previewEnabled || (v.trim() !== "" && Number(v) > 0) || "Required when preview is enabled",
                  })}
                />
                {errors.previewPageCount ? (
                  <span className="text-destructive text-xs">{errors.previewPageCount.message}</span>
                ) : (
                  editing?.totalPages && (
                    <span className="text-muted-foreground text-xs">
                      Max {editing.totalPages} pages
                    </span>
                  )
                )}
              </div>
            )}
          </div>}

          <div className="rounded-lg border p-3.5">
            <div className="flex items-center gap-2.5">
              <Switch
                checked={earlyBirdEnabled}
                onCheckedChange={(v) => setValue("earlyBirdEnabled", v)}
              />
              <span className="text-sm font-medium">Early bird pricing</span>
            </div>
            {earlyBirdEnabled && (
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="earlyBirdPrice">Early bird price (₹)</Label>
                  <Input
                    id="earlyBirdPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("earlyBirdPrice", {
                      validate: (v) =>
                        !earlyBirdEnabled || (v.trim() !== "" && Number(v) > 0) || "Required when early bird pricing is enabled",
                    })}
                  />
                  {errors.earlyBirdPrice && (
                    <span className="text-destructive text-xs">{errors.earlyBirdPrice.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="earlyBirdEndsAt">Ends at</Label>
                  <Input
                    id="earlyBirdEndsAt"
                    type="datetime-local"
                    {...register("earlyBirdEndsAt", {
                      validate: (v) => !earlyBirdEnabled || v.trim() !== "" || "Required when early bird pricing is enabled",
                    })}
                  />
                  {errors.earlyBirdEndsAt && (
                    <span className="text-destructive text-xs">{errors.earlyBirdEndsAt.message}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isMentorship && <div className="rounded-lg border p-3.5">
            <div className="flex items-center gap-2.5">
              <Switch
                checked={watch("isFeatured")}
                onCheckedChange={(v) => setValue("isFeatured", v)}
              />
              <span className="text-sm font-medium">Feature on landing page</span>
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs">
              Featured banks fill the &ldquo;Priced per bank&rdquo; section on the home page.
            </p>
          </div>}

          <div className="rounded-lg border p-3.5">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Highlights (optional)</span>
              <p className="text-muted-foreground text-xs">
                Short selling points shown as a checklist on the detail page and landing card.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {featureFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    placeholder={`e.g. ${
                      index === 0
                        ? "12-page free preview"
                        : index === 1
                          ? "600 questions, answer key included"
                          : "Instant download after purchase"
                    }`}
                    {...register(`features.${index}.value` as const, { maxLength: 120 })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove highlight"
                    onClick={() => removeFeature(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {featureFields.length < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2.5"
                onClick={() => appendFeature({ value: "" })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add highlight
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Switch
              checked={watch("isPublished")}
              onCheckedChange={(v) => setValue("isPublished", v)}
            />
            <span className="text-sm font-medium">Published (visible to students)</span>
          </div>
        </form>
        <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? "Saving…" : isMentorship ? "Save Mentorship" : isTestSeries ? "Save Test Series" : "Save Question Bank"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={paperToDelete !== null}
      onOpenChange={(next) => !next && setPaperToDelete(null)}
      title="Delete this paper and its answer key?"
      description={
        <>
          <strong>{paperToDelete?.fileName}</strong> will be removed for all students, along with any answer key
          linked to it. This can&apos;t be undone.
        </>
      }
      confirmLabel="Delete paper"
      onConfirm={async () => {
        if (paperToDelete) await handleDeletePaper(paperToDelete.id);
      }}
    />
    </>
  );
}
