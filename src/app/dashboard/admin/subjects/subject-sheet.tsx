"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAllCategories } from "@/features/categories/api";
import { createSubject, updateSubject, type Subject } from "@/features/subjects/api";

type SubjectSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Subject | null;
  onSaved: () => void;
};

type FormData = {
  name: string;
  slug: string;
};

const NO_CATEGORY = "none";

export function SubjectSheet({ open, onOpenChange, editing, onSaved }: SubjectSheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchAllCategories,
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (open) {
      reset(editing ? { name: editing.name, slug: editing.slug } : { name: "", slug: "" });
      setCategoryId(editing?.categoryId ?? NO_CATEGORY);
    }
  }, [open, editing, reset]);

  useEffect(() => {
    if (nameValue) {
      const slug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setValue("slug", slug);
    }
  }, [nameValue, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    const payload = {
      ...data,
      categoryId: categoryId === NO_CATEGORY ? null : categoryId,
    };
    try {
      if (editing) {
        await updateSubject(editing.id, payload);
        toast.success("Subject updated successfully.");
      } else {
        await createSubject(payload);
        toast.success("Subject created successfully.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Subject" : "New Subject"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the subject details below."
              : "Create a new subject for tagging question banks and test series."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Taxation"
              {...register("name", { required: true })}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="e.g., taxation"
              {...register("slug", { required: true })}
              disabled={submitting}
            />
            <p className="text-muted-foreground text-xs">
              URL-friendly identifier (lowercase, hyphens only)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? NO_CATEGORY)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {categoryId === NO_CATEGORY
                    ? "No category"
                    : (categories?.find((c) => c.id === categoryId)?.name ?? "No category")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Which exam level (CA Foundation / Inter / Final) this subject belongs to.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
