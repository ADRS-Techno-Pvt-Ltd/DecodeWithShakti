"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function PurchaseCard({
  questionBankId,
  basePrice,
  regularPrice,
  earlyBirdActive,
  alreadyOwned,
}: {
  questionBankId: string;
  basePrice: number;
  regularPrice: number;
  earlyBirdActive: boolean;
  alreadyOwned: boolean;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [couponCode, setCouponCode] = useState("");
  const [validated, setValidated] = useState<{ code: string; discountAmount: number } | null>(
    null,
  );
  const [validating, setValidating] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const finalAmount = basePrice - (validated?.discountAmount ?? 0);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setValidating(true);
    try {
      const res = await fetch("/api/v1/purchase/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, questionBankId }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Invalid coupon.");
        setValidated(null);
        return;
      }
      setValidated({ code: body.code, discountAmount: body.discountAmount });
      toast.success(`Coupon "${body.code}" applied.`);
    } finally {
      setValidating(false);
    }
  }

  async function purchase() {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch("/api/v1/purchase/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionBankId,
          couponCode: validated?.code,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Could not start purchase.");
        setPurchasing(false);
        return;
      }
      router.push(body.redirectUrl);
    } catch {
      toast.error("Something went wrong.");
      setPurchasing(false);
    }
  }

  return (
    <Card className="sticky top-24">
      <CardContent className="p-6">
        <div className="flex justify-between py-2 text-sm">
          <span>Base price</span>
          <span>{formatRupees(regularPrice)}</span>
        </div>
        {earlyBirdActive && (
          <div className="flex justify-between py-2 text-sm text-green-700">
            <span>
              Early bird discount <Badge className="ml-1 border-amber-200 bg-amber-50 text-amber-700">active</Badge>
            </span>
            <span>-{formatRupees(regularPrice - basePrice)}</span>
          </div>
        )}

        {!alreadyOwned && (
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={applyCoupon} disabled={validating}>
              Apply
            </Button>
          </div>
        )}
        {validated && (
          <div className="flex justify-between py-2 text-sm text-green-700">
            <span>Coupon &ldquo;{validated.code}&rdquo;</span>
            <span>-{formatRupees(validated.discountAmount)}</span>
          </div>
        )}

        <div className="mt-1.5 flex justify-between border-t pt-3.5 text-base font-bold">
          <span>Total payable</span>
          <span>{formatRupees(alreadyOwned ? regularPrice : finalAmount)}</span>
        </div>

        {alreadyOwned ? (
          <Button className="mt-4 w-full" render={<a href="/dashboard/student">Go to My Purchases</a>} />
        ) : (
          <Button className="mt-4 w-full" size="lg" onClick={purchase} disabled={purchasing}>
            {purchasing ? "Processing…" : "Purchase Now"}
          </Button>
        )}
        <p className="text-muted-foreground mt-2.5 text-center text-xs">
          Secure checkout · Invoice generated automatically
        </p>
      </CardContent>
    </Card>
  );
}
