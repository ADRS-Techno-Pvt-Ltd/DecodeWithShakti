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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCoupon, updateCoupon, type Coupon } from "@/features/coupons/api";

type FormValues = {
  code: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: string;
  expiresAt: string;
  usageLimit: string;
  isActive: boolean;
};

function paiseToRupees(paise: number): string {
  return String(paise / 100);
}

function rupeesToPaise(rupees: string): number {
  return Math.round(Number(rupees) * 100);
}

export function CouponSheet({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Coupon | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      code: "",
      discountType: "FLAT",
      discountValue: "",
      expiresAt: "",
      usageLimit: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (editing) {
      reset({
        code: editing.code,
        discountType: editing.discountType,
        discountValue:
          editing.discountType === "FLAT"
            ? paiseToRupees(editing.discountValue)
            : String(editing.discountValue),
        expiresAt: editing.expiresAt.slice(0, 16),
        usageLimit: String(editing.usageLimit),
        isActive: editing.isActive,
      });
    } else {
      reset({
        code: "",
        discountType: "FLAT",
        discountValue: "",
        expiresAt: "",
        usageLimit: "",
        isActive: true,
      });
    }
  }, [editing, reset, open]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const input = {
        code: values.code,
        discountType: values.discountType,
        discountValue:
          values.discountType === "FLAT"
            ? rupeesToPaise(values.discountValue)
            : Number(values.discountValue),
        expiresAt: new Date(values.expiresAt).toISOString(),
        usageLimit: Number(values.usageLimit),
        isActive: values.isActive,
      };
      if (editing) {
        await updateCoupon(editing.id, input);
        toast.success("Coupon updated.");
      } else {
        await createCoupon(input);
        toast.success("Coupon created.");
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
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit Coupon" : "New Coupon"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="WELCOME50" {...register("code", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Discount type</Label>
              <Select
                value={watch("discountType")}
                onValueChange={(v) => setValue("discountType", v as "PERCENT" | "FLAT")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT">Flat (₹)</SelectItem>
                  <SelectItem value="PERCENT">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discountValue">
                Value {watch("discountType") === "FLAT" ? "(₹)" : "(%)"}
              </Label>
              <Input
                id="discountValue"
                type="number"
                step={watch("discountType") === "FLAT" ? "0.01" : "1"}
                min="0"
                {...register("discountValue", { required: true })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expiresAt">Expires at</Label>
              <Input id="expiresAt" type="datetime-local" {...register("expiresAt", { required: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="usageLimit">Usage limit</Label>
              <Input id="usageLimit" type="number" {...register("usageLimit", { required: true })} />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} />
            <span className="text-sm font-medium">Active</span>
          </div>
        </form>
        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? "Saving…" : "Save Coupon"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
