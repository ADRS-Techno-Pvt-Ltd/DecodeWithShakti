"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useCashfreeSdk } from "@/lib/payment/use-cashfree-sdk";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

/** Perforated ticket bottom edge, matched to the checkout mockup. */
const edgeStyle: React.CSSProperties = {
  background: "var(--card)",
  filter: "drop-shadow(0 5px 6px rgba(53,47,158,0.15))",
  WebkitMaskImage:
    "linear-gradient(135deg, #000 50%, transparent 0), linear-gradient(45deg, #000 50%, transparent 0)",
  WebkitMaskSize: "14px 14px",
  WebkitMaskPosition: "0 0, 7px 0",
  WebkitMaskRepeat: "repeat-x",
  maskImage:
    "linear-gradient(135deg, #000 50%, transparent 0), linear-gradient(45deg, #000 50%, transparent 0)",
  maskSize: "14px 14px",
  maskPosition: "0 0, 7px 0",
  maskRepeat: "repeat-x",
};

function TicketShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-6">
      <div className="overflow-hidden rounded-t-[14px] border border-border bg-card shadow-[0_18px_40px_-28px_rgba(53,47,158,0.35)]">
        <div className="flex items-baseline justify-between border-b border-dashed border-primary/25 px-6 pt-5 pb-4">
          <h2 className="font-heading text-[18px] font-medium">Order summary</h2>
        </div>
        <div className="px-6 pt-5 pb-2">{children}</div>
      </div>
      <div aria-hidden className="h-3" style={edgeStyle} />
    </div>
  );
}

function FeatureList({ features }: { features: string[] }) {
  if (features.length === 0) return null;
  return (
    <ul className="mb-5 flex flex-col gap-2.5 text-[13.8px] text-muted-foreground">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
          {feature}
        </li>
      ))}
    </ul>
  );
}

export function PurchaseCard({
  questionBankId,
  basePrice,
  regularPrice,
  earlyBirdActive,
  alreadyOwned,
  features = [],
}: {
  questionBankId: string;
  basePrice: number;
  regularPrice: number;
  earlyBirdActive: boolean;
  alreadyOwned: boolean;
  features?: string[];
}) {
  const router = useRouter();
  const { status } = useSession();
  const cashfree = useCashfreeSdk();
  const [couponCode, setCouponCode] = useState("");
  const [validated, setValidated] = useState<{ code: string; discountAmount: number } | null>(
    null,
  );
  const [validating, setValidating] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState("");

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
    if (needsPhone && !/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Enter a valid 10-digit phone number.");
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
          phone: needsPhone ? phone : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body?.error === "PHONE_REQUIRED") {
          setNeedsPhone(true);
          setPurchasing(false);
          return;
        }
        toast.error(body?.error ?? "Could not start purchase.");
        setPurchasing(false);
        return;
      }

      if (body.free) {
        // 100% discount — already finalized server-side, nothing to check out.
        router.push(`/purchase/${body.purchaseId}/return`);
        return;
      }

      if (body.sessionId && cashfree) {
        const result = await cashfree.checkout({
          paymentSessionId: body.sessionId,
          redirectTarget: "_modal",
        });
        // checkout() has three terminal states — none of them proves payment
        // succeeded. Whatever happens, the return page is what decides the
        // real status by backend-verifying with the provider.
        if (result.redirect) return; // navigating to a hosted page — return_url handler takes over
        if (result.error) toast.info("Payment was not completed.");
        router.push(`/purchase/${body.purchaseId}/return`);
      } else if (body.redirectUrl) {
        router.push(body.redirectUrl); // mock path
      } else {
        setPurchasing(false);
        toast.error("Could not start checkout.");
      }
    } catch {
      toast.error("Something went wrong.");
      setPurchasing(false);
    }
  }

  if (alreadyOwned) {
    return (
      <TicketShell>
        <div className="relative">
          <span className="pointer-events-none absolute -top-2 right-0 -rotate-12 rounded-full border-2 border-success/60 px-3 py-2.5 font-mono text-[12px] tracking-[0.08em] text-success/80 uppercase">
            paid
          </span>
          <div className="flex items-start gap-2.5 rounded-md bg-success/10 px-3.5 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Purchased and ready to download anytime from your student dashboard.
          </div>
        </div>
        <a
          href="/dashboard/student/purchases"
          className="mt-4 mb-5 block w-full rounded-[9px] bg-primary-light py-3 text-center text-[15px] font-medium text-white transition-colors hover:bg-primary"
        >
          Go to my purchases
        </a>
        <FeatureList features={features} />
      </TicketShell>
    );
  }

  return (
    <TicketShell>
      <div className="mb-4 flex items-center justify-between text-[14.5px]">
        <span className="text-muted-foreground">Base price</span>
        <span className="font-mono font-medium">{formatRupees(regularPrice)}</span>
      </div>

      {earlyBirdActive && (
        <div className="mb-4 flex items-center justify-between text-[14.5px] text-success">
          <span className="flex items-center gap-1.5">
            Early bird
            <span className="rounded-full border border-gold/40 bg-gold-pale px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] text-gold-ink uppercase">
              active
            </span>
          </span>
          <span className="font-mono font-medium">
            &minus;{formatRupees(regularPrice - basePrice)}
          </span>
        </div>
      )}

      <div className="mt-1 mb-5 flex gap-2">
        <input
          placeholder="Coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          className="min-w-0 flex-1 border-0 border-b-[1.5px] border-primary/30 bg-transparent px-0.5 pt-1.5 pb-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
        />
        <button
          type="button"
          onClick={applyCoupon}
          disabled={validating}
          className="rounded-[7px] border border-primary/30 bg-accent px-4 text-[13px] font-medium text-primary-dark transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {validated && (
        <div className="mb-4 flex items-center justify-between text-[14.5px] text-success">
          <span>Coupon &ldquo;{validated.code}&rdquo;</span>
          <span className="font-mono font-medium">
            &minus;{formatRupees(validated.discountAmount)}
          </span>
        </div>
      )}

      {needsPhone && (
        <div className="mt-1 mb-5">
          <input
            placeholder="Phone number (required for payment)"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            className="w-full border-0 border-b-[1.5px] border-primary/30 bg-transparent px-0.5 pt-1.5 pb-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
          />
        </div>
      )}

      <hr className="mt-1.5 mb-4 border-0 border-t border-dashed border-primary/25" />

      <div className="mb-5 flex items-baseline justify-between">
        <span className="font-medium">Total payable</span>
        <span className="font-mono text-[20px] font-semibold text-primary">
          {formatRupees(finalAmount)}
        </span>
      </div>

      <button
        type="button"
        onClick={purchase}
        disabled={purchasing}
        className="mb-3 w-full rounded-[9px] bg-primary-light py-3 text-[15px] font-medium text-white transition-[background-color,transform] hover:bg-primary active:scale-[0.98] disabled:opacity-60"
      >
        {purchasing ? "Processing…" : "Purchase now →"}
      </button>
      <p className="mb-5 text-center text-[11.5px] text-muted-foreground">
        Secure checkout · invoice generated automatically
      </p>

      {features.length > 0 && (
        <>
          <hr className="mt-1.5 mb-4 border-0 border-t border-dashed border-primary/25" />
          <FeatureList features={features} />
        </>
      )}
    </TicketShell>
  );
}
