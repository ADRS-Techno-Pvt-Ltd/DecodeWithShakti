import { AlertTriangle } from "lucide-react";
import { PAYMENTS_DISABLED, PAYMENTS_DISABLED_MESSAGE } from "@/lib/payments-flag";

/** Shown on cart/checkout entry points while NEXT_PUBLIC_PAYMENTS_DISABLED="true". */
export function PaymentsDisabledBanner() {
  if (!PAYMENTS_DISABLED) return null;

  return (
    <div className="mb-6 flex items-start gap-2.5 rounded-[10px] border border-warning/30 bg-warning/10 px-4 py-3 text-[13.5px] text-warning">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      <span>{PAYMENTS_DISABLED_MESSAGE}</span>
    </div>
  );
}
