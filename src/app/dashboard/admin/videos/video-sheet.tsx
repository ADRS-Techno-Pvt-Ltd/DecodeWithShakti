"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import type { Category } from "@/features/question-banks/types";
import type { Video, VideoSource } from "@/features/videos/types";
import { createVideo, updateVideo, replaceVideoThumbnail } from "@/features/videos/api";

const NO_CATEGORY = "__none__";

type FormValues = {
  title: string;
  description: string;
  categoryId: string;
  sourceType: VideoSource;
  youtubeUrl: string;
  isPublished: boolean;
  isFeatured: boolean;
  file: FileList | null;
  thumbnail: FileList | null;
};

const emptyValues: FormValues = {
  title: "",
  description: "",
  categoryId: NO_CATEGORY,
  sourceType: "YOUTUBE",
  youtubeUrl: "",
  isPublished: true,
  isFeatured: false,
  file: null,
  thumbnail: null,
};

export function VideoSheet({
  open,
  onOpenChange,
  categories,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing: Video | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: emptyValues });

  useEffect(() => {
    if (editing) {
      reset({
        ...emptyValues,
        title: editing.title,
        description: editing.description,
        categoryId: editing.categoryId ?? NO_CATEGORY,
        sourceType: editing.sourceType,
        youtubeUrl: editing.youtubeVideoId
          ? `https://www.youtube.com/watch?v=${editing.youtubeVideoId}`
          : "",
        isPublished: editing.isPublished,
        isFeatured: editing.isFeatured,
      });
    } else {
      reset(emptyValues);
    }
  }, [editing, reset, open]);

  const sourceType = watch("sourceType");
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
    try {
      const categoryId = values.categoryId === NO_CATEGORY ? undefined : values.categoryId;

      if (editing) {
        await updateVideo(editing.id, {
          title: values.title,
          description: values.description,
          categoryId,
          youtubeUrl: editing.sourceType === "YOUTUBE" ? values.youtubeUrl : undefined,
          isPublished: values.isPublished,
          isFeatured: values.isFeatured,
        });
        if (values.thumbnail && values.thumbnail.length > 0) {
          await replaceVideoThumbnail(editing.id, values.thumbnail[0]);
        }
        toast.success("Video updated.");
      } else {
        if (values.sourceType === "UPLOAD" && (!values.file || values.file.length === 0)) {
          toast.error("Please choose a video file.");
          setSubmitting(false);
          return;
        }
        if (values.sourceType === "YOUTUBE" && values.youtubeUrl.trim() === "") {
          toast.error("Please paste a YouTube URL.");
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.set("title", values.title);
        formData.set("description", values.description);
        if (categoryId) formData.set("categoryId", categoryId);
        formData.set("sourceType", values.sourceType);
        if (values.sourceType === "YOUTUBE") {
          formData.set("youtubeUrl", values.youtubeUrl);
        } else if (values.file && values.file.length > 0) {
          formData.set("file", values.file[0]);
        }
        formData.set("isPublished", String(values.isPublished));
        formData.set("isFeatured", String(values.isFeatured));
        if (values.thumbnail && values.thumbnail.length > 0) {
          formData.set("thumbnail", values.thumbnail[0]);
        }
        await createVideo(formData);
        toast.success("Video added.");
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
          <DialogTitle>{editing ? "Edit Video" : "Add Video"}</DialogTitle>
          <DialogDescription>YouTube link or direct file upload</DialogDescription>
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

          <div className="flex flex-col gap-1.5">
            <Label>Category (optional)</Label>
            <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v ?? NO_CATEGORY)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No category">
                  {(value) =>
                    value === NO_CATEGORY
                      ? "No category"
                      : (categories.find((c) => c.id === value)?.name ?? "No category")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!editing && (
            <div className="flex flex-col gap-1.5">
              <Label>Source</Label>
              <Select value={sourceType} onValueChange={(v) => setValue("sourceType", (v as VideoSource) ?? "YOUTUBE")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YOUTUBE">YouTube link</SelectItem>
                  <SelectItem value="UPLOAD">Upload a file</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(editing ? editing.sourceType === "YOUTUBE" : sourceType === "YOUTUBE") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input
                id="youtubeUrl"
                placeholder="https://www.youtube.com/watch?v=…"
                {...register("youtubeUrl", { required: sourceType === "YOUTUBE" })}
              />
              {errors.youtubeUrl && (
                <span className="text-destructive text-xs">A YouTube URL is required.</span>
              )}
            </div>
          )}

          {!editing && sourceType === "UPLOAD" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file">Video file</Label>
              <Input id="file" type="file" accept="video/*" {...register("file")} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thumbnail">Thumbnail {editing ? "(replace)" : "(optional)"}</Label>
            <p className="text-muted-foreground text-xs">
              {(editing ? editing.sourceType : sourceType) === "YOUTUBE"
                ? "Defaults to the video's own YouTube thumbnail if you don't set one."
                : "Defaults to a generic placeholder if you don't set one."}
            </p>
            {(thumbnailPreview ?? editing?.thumbnailUrl) && (
              <div className="relative aspect-video w-48 bg-muted">
                <img
                  src={thumbnailPreview ?? editing?.thumbnailUrl ?? undefined}
                  alt=""
                  className="h-full w-full rounded-md border object-cover"
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

          <div className="rounded-lg border p-3.5">
            <div className="flex items-center gap-2.5">
              <Switch checked={watch("isFeatured")} onCheckedChange={(v) => setValue("isFeatured", v)} />
              <span className="text-sm font-medium">Feature this video</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Switch checked={watch("isPublished")} onCheckedChange={(v) => setValue("isPublished", v)} />
            <span className="text-sm font-medium">Published (visible to students)</span>
          </div>
        </form>
        <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? "Saving…" : "Save Video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
