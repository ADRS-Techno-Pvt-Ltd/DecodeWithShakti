"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecheckPaymentButton({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const res = await fetch("/api/v1/payment/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Re-check failed.");
        return;
      }
      toast.success("Payment status re-checked.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={check} disabled={checking} className="gap-1.5">
      <Search className="h-3.5 w-3.5" />
      {checking ? "Checking…" : "Re-check"}
    </Button>
  );
}
