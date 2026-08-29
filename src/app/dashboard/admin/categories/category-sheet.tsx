"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCategory, updateCategory, type Category } from "@/features/categories/api";

type CategorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Category | null;
  onSaved: () => void;
};

type FormData = {
  name: string;
  slug: string;
};

export function CategorySheet({ open, onOpenChange, editing, onSaved }: CategorySheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>();

  const nameValue = watch("name");

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          slug: editing.slug,
        });
      } else {
        reset({
          name: "",
          slug: "",
        });
      }
    }
  }, [open, editing, reset]);

  // Auto-generate slug from name
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
    try {
      if (editing) {
        await updateCategory(editing.id, data);
        toast.success("Category updated successfully.");
      } else {
        await createCategory(data);
        toast.success("Category created successfully.");
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
          <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the category details below."
              : "Create a new category for organizing question banks."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Mathematics"
              {...register("name", { required: true })}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="e.g., mathematics"
              {...register("slug", { required: true })}
              disabled={submitting}
            />
            <p className="text-muted-foreground text-xs">
              URL-friendly identifier (lowercase, hyphens only)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
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
