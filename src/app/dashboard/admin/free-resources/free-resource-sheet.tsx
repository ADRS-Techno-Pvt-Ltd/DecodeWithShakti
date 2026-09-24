"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
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
import type { Category, FreeResource, Subject } from "@/features/free-resources/types";
import {
  createFreeResource,
  updateFreeResource,
  replaceFreeResourceThumbnail,
  replaceFreeResourceFile,
  addOrReplaceFreeResourceAnswerKey,
  deleteFreeResourceAnswerKey,
} from "@/features/free-resources/api";

type FormValues = {
  title: string;
  description: string;
  categoryId: string;
  subjectId: string;
  isPublished: boolean;
  file: FileList | null;
  thumbnail: FileList | null;
  answerKey: FileList | null;
};

export function FreeResourceSheet({
  open,
  onOpenChange,
  categories,
  subjects,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  subjects: Subject[];
  editing: FreeResource | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [removingAnswerKey, setRemovingAnswerKey] = useState(false);
  const [answerKey, setAnswerKeyState] = useState<{ fileName: string; fileSizeBytes: number } | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      subjectId: "",
      isPublished: true,
      file: null,
      thumbnail: null,
      answerKey: null,
    },
  });

  useEffect(() => {
    setAnswerKeyState(
      editing?.answerKeyFileName
        ? { fileName: editing.answerKeyFileName, fileSizeBytes: editing.answerKeyFileSizeBytes ?? 0 }
        : null,
    );
    if (editing) {
      reset({
        title: editing.title,
        description: editing.description,
        categoryId: editing.categoryId ?? "",
        subjectId: editing.subjectId ?? "",
        isPublished: editing.isPublished,
        file: null,
        thumbnail: null,
        answerKey: null,
      });
    } else {
      reset({
        title: "",
        description: "",
        categoryId: "",
        subjectId: "",
        isPublished: true,
        file: null,
        thumbnail: null,
        answerKey: null,
      });
    }
  }, [editing, reset, open]);

  async function handleRemoveAnswerKey() {
    if (!editing) return;
    setRemovingAnswerKey(true);
    try {
      await deleteFreeResourceAnswerKey(editing.id);
      setAnswerKeyState(null);
      toast.success("Answer key removed.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove answer key.");
    } finally {
      setRemovingAnswerKey(false);
    }
  }

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

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await updateFreeResource(editing.id, {
          title: values.title,
          description: values.description,
          categoryId: values.categoryId ? values.categoryId : null,
          subjectId: values.subjectId ? values.subjectId : null,
          isPublished: values.isPublished,
        });
        if (values.thumbnail && values.thumbnail.length > 0) {
          await replaceFreeResourceThumbnail(editing.id, values.thumbnail[0]);
        }
        if (values.file && values.file.length > 0) {
          await replaceFreeResourceFile(editing.id, values.file[0]);
        }
        if (values.answerKey && values.answerKey.length > 0) {
          await addOrReplaceFreeResourceAnswerKey(editing.id, values.answerKey[0]);
        }
        toast.success("Free resource updated.");
      } else {
        if (!values.file || values.file.length === 0) {
          toast.error("Please choose a PDF file.");
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.set("title", values.title);
        formData.set("description", values.description);
        if (values.categoryId) formData.set("categoryId", values.categoryId);
        if (values.subjectId) formData.set("subjectId", values.subjectId);
        formData.set("isPublished", String(values.isPublished));
        formData.set("file", values.file[0]);
        if (values.thumbnail && values.thumbnail.length > 0) {
          formData.set("thumbnail", values.thumbnail[0]);
        }
        if (values.answerKey && values.answerKey.length > 0) {
          formData.set("answerKey", values.answerKey[0]);
        }
        await createFreeResource(formData);
        toast.success("Free resource uploaded.");
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
    <Dialog
      open={open}
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
          <DialogTitle>{editing ? "Edit Free Resource" : "Upload Free Resource"}</DialogTitle>
          <DialogDescription>PDF only, publicly downloadable — no purchase required</DialogDescription>
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
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category (optional)</Label>
              <Select
                value={watch("categoryId") || "none"}
                onValueChange={(v) => {
                  const next = !v || v === "none" ? "" : v;
                  setValue("categoryId", next);
                  const current = watch("subjectId");
                  if (
                    current &&
                    !subjects.some((s) => s.id === current && (s.categoryId === next || s.categoryId == null))
                  ) {
                    setValue("subjectId", "");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No category">
                    {(value) => categories.find((c) => c.id === value)?.name ?? "No category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Subject (optional)</Label>
              <Select
                value={watch("subjectId") || "none"}
                onValueChange={(v) => setValue("subjectId", !v || v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No subject">
                    {(value) => subjects.find((s) => s.id === value)?.name ?? "No subject"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {subjects
                    .filter((s) => s.categoryId == null || s.categoryId === watch("categoryId"))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">PDF File {editing ? "(replace)" : ""}</Label>
            <input
              id="file"
              type="file"
              accept="application/pdf"
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              {...register("file")}
            />
            <span className="text-muted-foreground text-xs">
              {editing ? "Leave empty to keep the current file." : "Select a single PDF."}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="answerKey">Answer key / solutions PDF (optional)</Label>
            {answerKey && (
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <span className="truncate">{answerKey.fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove answer key"
                  disabled={removingAnswerKey}
                  onClick={handleRemoveAnswerKey}
                >
                  {removingAnswerKey ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
            <input
              id="answerKey"
              type="file"
              accept="application/pdf"
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              {...register("answerKey")}
            />
            <span className="text-muted-foreground text-xs">
              {answerKey ? "Select a PDF to replace it." : "Select a PDF to add an answer key alongside the main file."}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thumbnail">
              Thumbnail {editing ? "(replace)" : "(optional)"} — shown on the Free Resources page
            </Label>
            {(thumbnailPreview ?? editing?.thumbnailUrl) && (
              <div className="relative aspect-video w-48 bg-muted">
                <img
                  src={thumbnailPreview ?? editing?.thumbnailUrl ?? undefined}
                  alt=""
                  className="h-full w-full rounded-md border object-contain"
                />
              </div>
            )}
            <Input id="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" {...register("thumbnail")} />
          </div>

          <div className="flex items-center gap-2.5">
            <Switch checked={watch("isPublished")} onCheckedChange={(v) => setValue("isPublished", v)} />
            <span className="text-sm font-medium">Published (visible to everyone)</span>
          </div>
        </form>
        <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Resource"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
