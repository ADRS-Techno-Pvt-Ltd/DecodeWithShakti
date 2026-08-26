"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCoupons, deleteCoupon, type Coupon } from "@/features/coupons/api";
import { CouponSheet } from "./coupon-sheet";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

function couponStatus(coupon: Coupon) {
  if (!coupon.isActive) return <Badge variant="secondary">Inactive</Badge>;
  if (new Date(coupon.expiresAt) < new Date())
    return <Badge className="border-red-200 bg-red-50 text-red-700">Expired</Badge>;
  if (coupon.usedCount >= coupon.usageLimit)
    return <Badge className="border-red-200 bg-red-50 text-red-700">Exhausted</Badge>;
  return <Badge className="border-green-200 bg-green-50 text-green-700">Active</Badge>;
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const { data: coupons, isLoading } = useQuery({ queryKey: ["coupons"], queryFn: fetchCoupons });

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;
    try {
      await deleteCoupon(coupon.id);
      toast.success("Coupon deleted.");
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete coupon.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Coupons</h1>
          <p className="text-muted-foreground text-sm">
            Global codes — expiry + usage-limit only.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          + New Coupon
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !coupons || coupons.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">No coupons yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.code}</TableCell>
                  <TableCell>
                    {c.discountType === "PERCENT" ? `${c.discountValue}% off` : `${formatRupees(c.discountValue)} flat`}
                  </TableCell>
                  <TableCell>
                    {c.usedCount} / {c.usageLimit}
                  </TableCell>
                  <TableCell>{new Date(c.expiresAt).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>{couponStatus(c)}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(c);
                        setSheetOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CouponSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["coupons"] })}
      />
    </div>
  );
}
