"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { useCartStore, cartSubtotal, type CartItem } from "@/stores/cart-store";
import { useCashfreeSdk } from "@/lib/payment/use-cashfree-sdk";
import { CartApiError, createCartOrder, previewCart, type CartPreviewResponse } from "@/features/cart/api";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

const TYPE_LABEL: Record<CartItem["type"], string> = {
  QUESTION_BANK: "Question Bank",
  TEST_SERIES: "Test Series",
  MENTORSHIP: "Mentorship",
};

export default function CartPage() {
  const router = useRouter();
  const { status } = useSession();
  const cashfree = useCashfreeSdk();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const addItem = useCartStore((s) => s.addItem);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const itemIds = useMemo(() => items.map((i) => i.questionBankId).sort(), [items]);
  const clientSubtotal = cartSubtotal(items);

  const previewQuery = useQuery<CartPreviewResponse>({
    // Re-fetches whenever the cart contents or coupon change, per the plan's
    // "cart page's live preview must be the source of truth shown to the
    // student" requirement.
    queryKey: ["cart-preview", itemIds, appliedCoupon],
    queryFn: () =>
      previewCart({
        questionBankIds: items.map((i) => i.questionBankId),
        couponCode: appliedCoupon ?? undefined,
      }),
    enabled: items.length > 0,
  });

  // The store snapshot's thumbnail/title/price are captured at add-to-cart time and
  // can go stale (e.g. a thumbnail uploaded after the item was already in the cart —
  // see the header cart dropdown, which has no live preview of its own and just reads
  // this store). Once the live preview lands, refresh any entries that drifted so the
  // persisted snapshot stays current everywhere it's shown, not just on this page.
  useEffect(() => {
    const preview = previewQuery.data;
    if (!preview) return;
    for (const line of preview.items) {
      const stored = items.find((i) => i.questionBankId === line.questionBankId);
      if (!stored) continue;
      if (
        stored.thumbnailPath !== line.thumbnailPath ||
        stored.title !== line.title ||
        stored.price !== line.basePrice
      ) {
        addItem({ ...stored, thumbnailPath: line.thumbnailPath, title: line.title, price: line.basePrice });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewQuery.data]);

  function applyCoupon() {
    if (!couponInput.trim()) return;
    setAppliedCoupon(couponInput.trim().toUpperCase());
  }

  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
  }

  async function checkout() {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    if (needsPhone && !/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }
    setCheckingOut(true);
    try {
      const result = await createCartOrder({
        questionBankIds: items.map((i) => i.questionBankId),
        couponCode: appliedCoupon ?? undefined,
        phone: needsPhone ? phone : undefined,
      });

      if (result.free) {
        useCartStore.getState().clear();
        router.push(`/purchase/order/${result.orderId}/return`);
        return;
      }

      if (result.sessionId && cashfree) {
        const checkoutResult = await cashfree.checkout({
          paymentSessionId: result.sessionId,
          redirectTarget: "_modal",
        });
        useCartStore.getState().clear();
        if (checkoutResult.redirect) return; // hosted page — return_url handler takes over
        if (checkoutResult.error) toast.info("Payment was not completed.");
        router.push(`/purchase/order/${result.orderId}/return`);
      } else if (result.redirectUrl) {
        useCartStore.getState().clear();
        router.push(result.redirectUrl); // mock path
      } else {
        setCheckingOut(false);
        toast.error("Could not start checkout.");
      }
    } catch (err) {
      if (err instanceof CartApiError && err.code === "PHONE_REQUIRED") {
        setNeedsPhone(true);
        setCheckingOut(false);
        return;
      }
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setCheckingOut(false);
    }
  }

  const preview = previewQuery.data;
  const total = preview?.total ?? clientSubtotal;

  return (
    <div className="min-h-full bg-neutral-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-heading mb-7 text-[26px] font-medium">Your cart</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-border bg-card px-6 py-16 text-center">
            <ShoppingCart className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-[15px] text-muted-foreground">Your cart is empty.</p>
            <Link
              href="/question-banks"
              className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/80"
            >
              Browse question banks
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const previewLine = preview?.items.find((p) => p.questionBankId === item.questionBankId);
                return (
                  <div
                    key={item.questionBankId}
                    className="flex items-center gap-4 rounded-[12px] border border-border bg-card px-4 py-3.5"
                  >
                    <div className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-accent">
                      {previewLine?.thumbnailPath ?? item.thumbnailPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewLine?.thumbnailPath ?? item.thumbnailPath ?? undefined}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-5 w-5 text-primary-light" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium">{item.title}</p>
                      <p className="text-[12px] text-muted-foreground">{TYPE_LABEL[item.type]}</p>
                    </div>
                    <span className="font-mono text-[14.5px] font-medium whitespace-nowrap">
                      {formatRupees(previewLine?.amount ?? item.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.questionBankId)}
                      aria-label={`Remove ${item.title}`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="sticky top-6 rounded-[14px] border border-border bg-card p-6 shadow-[0_18px_40px_-28px_rgba(53,47,158,0.35)]">
              <h2 className="font-heading mb-4 text-[16px] font-medium">Order summary</h2>

              <div className="mb-4 flex gap-2">
                <input
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  disabled={!!appliedCoupon}
                  className="min-w-0 flex-1 border-0 border-b-[1.5px] border-primary/30 bg-transparent px-0.5 pt-1.5 pb-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={appliedCoupon ? clearCoupon : applyCoupon}
                  className="rounded-[7px] border border-primary/30 bg-accent px-4 text-[13px] font-medium text-primary-dark transition-colors hover:bg-primary/10"
                >
                  {appliedCoupon ? "Remove" : "Apply"}
                </button>
              </div>

              {previewQuery.isFetching && (
                <p className="mb-3 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Updating totals…
                </p>
              )}
              {previewQuery.isError && (
                <p className="mb-3 text-[12.5px] text-destructive">
                  {previewQuery.error instanceof Error
                    ? previewQuery.error.message
                    : "Could not load pricing."}
                </p>
              )}

              <div className="flex items-center justify-between text-[14px]">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatRupees(preview?.subtotal ?? clientSubtotal)}</span>
              </div>

              {!!preview?.couponDiscountAmount && (
                <div className="mt-2 flex items-center justify-between text-[14px] text-success">
                  <span>Coupon discount</span>
                  <span className="font-mono">&minus;{formatRupees(preview.couponDiscountAmount)}</span>
                </div>
              )}

              {!!preview?.bundleDiscountAmount && (
                <div className="mt-2 flex items-center justify-between text-[14px] text-success">
                  <span>Bundle discount ({preview.bundleDiscountPercentApplied}%)</span>
                  <span className="font-mono">&minus;{formatRupees(preview.bundleDiscountAmount)}</span>
                </div>
              )}

              {items.length >= 2 && !preview?.bundleDiscountAmount && !previewQuery.isFetching && (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {appliedCoupon
                    ? "Coupons and bundle discounts can't be combined."
                    : "No bundle discount currently applies to these items."}
                </p>
              )}

              <hr className="my-4 border-0 border-t border-dashed border-primary/25" />

              <div className="mb-5 flex items-baseline justify-between">
                <span className="font-medium">Total payable</span>
                <span className="font-mono text-[20px] font-semibold text-primary">
                  {formatRupees(total)}
                </span>
              </div>

              {needsPhone && (
                <div className="mb-5">
                  <input
                    placeholder="Phone number (required for payment)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    className="w-full border-0 border-b-[1.5px] border-primary/30 bg-transparent px-0.5 pt-1.5 pb-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={checkout}
                disabled={checkingOut || previewQuery.isFetching}
                className="w-full rounded-[9px] bg-primary-light py-3 text-[15px] font-medium text-white transition-[background-color,transform] hover:bg-primary active:scale-[0.98] disabled:opacity-60"
              >
                {checkingOut ? "Processing…" : "Checkout →"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
