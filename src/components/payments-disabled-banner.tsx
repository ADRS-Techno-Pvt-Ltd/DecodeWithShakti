import Link from "next/link";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENTS_DISABLED, PAYMENTS_DISABLED_MESSAGE } from "@/lib/payments-flag";

/** Shown on cart/checkout entry points while NEXT_PUBLIC_PAYMENTS_DISABLED="true". */
export function PaymentsDisabledBanner() {
  if (!PAYMENTS_DISABLED) return null;

  return (
    <div className="mb-6 flex flex-col items-start gap-3 rounded-[10px] border border-destructive bg-destructive/10 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-start gap-2.5 text-[13.5px] font-medium text-destructive">
        <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" strokeWidth={2.25} />
        {PAYMENTS_DISABLED_MESSAGE}
      </span>
      <Button
        size="sm"
        className="shrink-0 bg-destructive text-white hover:bg-destructive/85"
        render={
          <Link href="/contact">
            <MessageCircle />
            Contact us
          </Link>
        }
      />
    </div>
  );
}
