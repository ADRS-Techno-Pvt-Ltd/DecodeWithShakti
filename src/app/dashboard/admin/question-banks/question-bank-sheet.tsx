"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
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
import type { Category, QuestionBank } from "@/features/question-banks/types";
import {
  createQuestionBank,
  updateQuestionBank,
  replaceQuestionBankThumbnail,
  createCategory,
} from "@/features/question-banks/api";

type FormValues = {
  title: string;
  description: string;
  categoryId: string;
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
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing: QuestionBank | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
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
      description: "",
      categoryId: "",
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
    },
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features",
  });

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const category = await createCategory(name);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      setValue("categoryId", category.id);
      setAddingCategory(false);
      setNewCategoryName("");
      toast.success(`Category "${category.name}" added.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add category.");
    } finally {
      setCreatingCategory(false);
    }
  }

  useEffect(() => {
    if (editing) {
      reset({
        title: editing.title,
        description: editing.description,
        categoryId: editing.categoryId,
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
      });
    } else {
      reset({
        title: "",
        description: "",
        categoryId: categories[0]?.id ?? "",
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
  }, [editing, categories, reset, open]);

  const previewEnabled = watch("previewEnabled");
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
          description: values.description,
          categoryId: values.categoryId,
          price: rupeesToPaise(values.price),
          previewEnabled: values.previewEnabled,
          previewPageCount: values.previewEnabled ? Number(values.previewPageCount) : undefined,
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
        toast.success("Question bank updated.");
      } else {
        if (!values.file || values.file.length === 0) {
          toast.error("Please choose a PDF file.");
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.set("title", values.title);
        formData.set("description", values.description);
        formData.set("categoryId", values.categoryId);
        formData.set("price", String(rupeesToPaise(values.price)));
        formData.set("previewEnabled", String(values.previewEnabled));
        if (values.previewEnabled) formData.set("previewPageCount", values.previewPageCount);
        if (values.earlyBirdEnabled) {
          formData.set("earlyBirdPrice", String(rupeesToPaise(values.earlyBirdPrice)));
          formData.set("earlyBirdEndsAt", new Date(values.earlyBirdEndsAt).toISOString());
        }
        formData.set("isPublished", String(values.isPublished));
        formData.set("isFeatured", String(values.isFeatured));
        formData.set("features", JSON.stringify(features));
        formData.set("file", values.file[0]);
        if (values.thumbnail && values.thumbnail.length > 0) {
          formData.set("thumbnail", values.thumbnail[0]);
        }
        await createQuestionBank(formData);
        toast.success("Question bank uploaded.");
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
          <DialogTitle>{editing ? "Edit Question Bank" : "Upload Question Bank"}</DialogTitle>
          <DialogDescription>PDF only</DialogDescription>
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
            <Textarea id="description" rows={3} {...register("description", { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select
                value={watch("categoryId")}
                onValueChange={(v) => {
                  if (v === "__new__") {
                    setAddingCategory(true);
                    return;
                  }
                  setValue("categoryId", v ?? "");
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
                  <SelectItem value="__new__" className="font-medium text-primary">
                    <Plus className="mr-1.5 inline h-3.5 w-3.5" />
                    Add new category
                  </SelectItem>
                </SelectContent>
              </Select>
              {addingCategory && (
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    autoFocus
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory();
                      }
                      if (e.key === "Escape") {
                        setAddingCategory(false);
                        setNewCategoryName("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={creatingCategory || !newCategoryName.trim()}
                    onClick={handleAddCategory}
                  >
                    {creatingCategory ? "Adding…" : "Add"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Cancel new category"
                    onClick={() => {
                      setAddingCategory(false);
                      setNewCategoryName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register("price", { required: true })}
              />
            </div>
          </div>

          {!editing && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file">Question Bank File (PDF)</Label>
              <Input id="file" type="file" accept="application/pdf" {...register("file")} />
            </div>
          )}

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

          <div className="rounded-lg border p-3.5">
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
          </div>

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

          <div className="rounded-lg border p-3.5">
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
          </div>

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
            {submitting ? "Saving…" : "Save Question Bank"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
