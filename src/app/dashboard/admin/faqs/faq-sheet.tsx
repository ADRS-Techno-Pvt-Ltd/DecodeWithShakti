"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createFaq, updateFaq, type Faq } from "@/features/faqs/api";

type FormValues = {
  question: string;
  answer: string;
  isPublished: boolean;
};

export function FaqSheet({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Faq | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
    defaultValues: { question: "", answer: "", isPublished: true },
  });

  useEffect(() => {
    reset(
      editing
        ? {
            question: editing.question,
            answer: editing.answer,
            isPublished: editing.isPublished,
          }
        : { question: "", answer: "", isPublished: true },
    );
  }, [editing, reset, open]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await updateFaq(editing.id, values);
        toast.success("FAQ updated.");
      } else {
        await createFaq(values);
        toast.success("FAQ added.");
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit FAQ" : "New FAQ"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="What exactly do I get after buying a question bank?"
              {...register("question", { required: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="answer">Answer</Label>
            <Textarea
              id="answer"
              rows={6}
              placeholder="A downloadable PDF of the full question bank…"
              {...register("answer", { required: true })}
            />
          </div>
          <div className="flex items-center gap-2.5">
            <Switch
              checked={watch("isPublished")}
              onCheckedChange={(v) => setValue("isPublished", v)}
            />
            <span className="text-sm font-medium">Published (visible on the landing page)</span>
          </div>
        </form>
        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? "Saving…" : "Save FAQ"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
