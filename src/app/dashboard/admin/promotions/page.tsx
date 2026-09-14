"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/landing/reveal";
import { productTypeLabel } from "@/lib/product-type";
import {
  fetchPromotionSettings,
  updatePromotionSetting,
  type PromotionSetting,
  type ProductType,
} from "@/features/promotions/api";

const PRODUCT_TYPE_ORDER: ProductType[] = ["TEST_SERIES", "QUESTION_BANK", "MENTORSHIP"];

type RowState = {
  multiItemDiscountEnabled: boolean;
  multiItemDiscountPercent: string;
  minQualifyingItems: number;
};

function toRowState(setting: PromotionSetting): RowState {
  return {
    multiItemDiscountEnabled: setting.multiItemDiscountEnabled,
    multiItemDiscountPercent: String(setting.multiItemDiscountPercent),
    minQualifyingItems: setting.minQualifyingItems,
  };
}

function PromotionRow({
  setting,
  onSaved,
}: {
  setting: PromotionSetting;
  onSaved: () => void;
}) {
  const [state, setState] = useState<RowState>(() => toRowState(setting));
  const [submitting, setSubmitting] = useState(false);

  const dirty =
    state.multiItemDiscountEnabled !== setting.multiItemDiscountEnabled ||
    Number(state.multiItemDiscountPercent) !== setting.multiItemDiscountPercent;

  async function handleSave() {
    const percent = Number(state.multiItemDiscountPercent);
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
      toast.error("Percentage must be a whole number between 0 and 100.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePromotionSetting({
        productType: setting.productType,
        multiItemDiscountEnabled: state.multiItemDiscountEnabled,
        multiItemDiscountPercent: percent,
        minQualifyingItems: state.minQualifyingItems,
      });
      toast.success(`${productTypeLabel(setting.productType)} discount updated.`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this setting.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{productTypeLabel(setting.productType)}</CardTitle>
        <CardDescription>
          Applies when 2+ distinct {productTypeLabel(setting.productType).toLowerCase()} items
          are in the cart.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-6">
        <div className="flex items-center gap-2.5">
          <Switch
            checked={state.multiItemDiscountEnabled}
            onCheckedChange={(v) => setState((s) => ({ ...s, multiItemDiscountEnabled: v }))}
          />
          <span className="text-sm font-medium">Enabled</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`percent-${setting.productType}`}>Discount (%)</Label>
          <Input
            id={`percent-${setting.productType}`}
            type="number"
            min="0"
            max="100"
            step="1"
            className="w-28"
            value={state.multiItemDiscountPercent}
            onChange={(e) =>
              setState((s) => ({ ...s, multiItemDiscountPercent: e.target.value }))
            }
          />
        </div>
        <Button onClick={handleSave} disabled={submitting || !dirty}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["promotion-settings"],
    queryFn: fetchPromotionSettings,
  });

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ["promotion-settings"] });
  }

  const ordered = settings
    ? [...settings].sort(
        (a, b) => PRODUCT_TYPE_ORDER.indexOf(a.productType) - PRODUCT_TYPE_ORDER.indexOf(b.productType),
      )
    : [];

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Multi-item Discount</h1>
          <p className="text-muted-foreground text-sm">
            Automatic percentage-off when a student adds 2+ qualifying items to their cart. One
            setting per product type — mixed-type carts use the lowest applicable percentage.
            Mutually exclusive with coupons.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {ordered.map((setting, i) => (
            <Reveal key={setting.productType} delay={i * 60}>
              <PromotionRow
                key={`${setting.productType}-${setting.updatedAt ?? "new"}`}
                setting={setting}
                onSaved={handleSaved}
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
