"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Banner } from "@/features/banners/types";
import { createBanner, updateBanner, replaceBannerImage } from "@/features/banners/api";
import { BannerImageCropDialog } from "./banner-image-crop-dialog";

type FormValues = {
  linkUrl: string;
  altText: string;
  isPublished: boolean;
};

const emptyValues: FormValues = { linkUrl: "", altText: "", isPublished: true };

export function BannerSheet({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Banner | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, watch, reset, setValue } = useForm<FormValues>({
    defaultValues: emptyValues,
  });

  // The image goes through a crop step before it's ever a form value — react-hook-form
  // only tracks the text fields, this state holds the final cropped file to upload.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawFile, setRawFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      reset({
        linkUrl: editing.linkUrl ?? "",
        altText: editing.altText,
        isPublished: editing.isPublished,
      });
    } else {
      reset(emptyValues);
    }
    setCroppedFile(null);
    setRawFile(null);
  }, [editing, reset, open]);

  useEffect(() => {
    if (!croppedFile) {
      setCroppedPreview(null);
      return;
    }
    const url = URL.createObjectURL(croppedFile);
    setCroppedPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [croppedFile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setRawFile((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { url: URL.createObjectURL(file), name: file.name, type: file.type };
    });
    setCropDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await updateBanner(editing.id, {
          linkUrl: values.linkUrl,
          altText: values.altText,
          isPublished: values.isPublished,
        });
        if (croppedFile) {
          await replaceBannerImage(editing.id, croppedFile);
        }
        toast.success("Banner updated.");
      } else {
        if (!croppedFile) {
          toast.error("Please choose a banner image.");
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.set("image", croppedFile);
        if (values.linkUrl) formData.set("linkUrl", values.linkUrl);
        formData.set("altText", values.altText);
        formData.set("isPublished", String(values.isPublished));
        await createBanner(formData);
        toast.success("Banner added.");
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
        onOpenChange={(next, details) => {
          if (!next && details?.reason !== "close-press" && details?.reason !== "imperative-action") {
            return;
          }
          onOpenChange(next);
        }}
        disablePointerDismissal
      >
        <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{editing ? "Edit Banner" : "Add Banner"}</DialogTitle>
            <DialogDescription>Shown in the homepage carousel, above the hero.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="image">Banner image {editing ? "(replace)" : ""}</Label>
              <p className="text-muted-foreground text-xs">
                After choosing a photo you&apos;ll pick the visible area, like a profile
                photo crop. JPEG/PNG/WebP, up to 5MB.
              </p>
              {(croppedPreview ?? editing?.imagePath) && (
                <div className="bg-muted aspect-[21/9] w-full overflow-hidden rounded-md border">
                  <img
                    src={croppedPreview ?? editing?.imagePath ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <Input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="linkUrl">Link URL (optional)</Label>
              <Input id="linkUrl" placeholder="/question-banks" {...register("linkUrl")} />
              <p className="text-muted-foreground text-xs">Where clicking the slide takes the visitor.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="altText">Alt text</Label>
              <Input id="altText" placeholder="Describe the image for accessibility" {...register("altText")} />
            </div>

            <div className="flex items-center gap-2.5">
              <Switch checked={watch("isPublished")} onCheckedChange={(v) => setValue("isPublished", v)} />
              <span className="text-sm font-medium">Published (visible on the homepage)</span>
            </div>
          </form>
          <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
              {submitting ? "Saving…" : "Save Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BannerImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={rawFile?.url ?? null}
        fileName={rawFile?.name ?? "banner.jpg"}
        mimeType={rawFile?.type || "image/jpeg"}
        onCropped={(file) => setCroppedFile(file)}
      />
    </>
  );
}
