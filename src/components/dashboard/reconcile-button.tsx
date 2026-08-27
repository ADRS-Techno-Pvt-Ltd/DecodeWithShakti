"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReconcileSummary = {
  scanned: number;
  resolved: Record<string, number>;
  invoicesRepaired: number;
  held: number;
  errors: number;
};

export function ReconcileButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/v1/payment/reconcile", { method: "POST" });
      const body = (await res.json()) as ReconcileSummary | { error: string };
      if (!res.ok || "error" in body) {
        toast.error("error" in body ? body.error : "Reconcile failed.");
        return;
      }
      const resolvedTotal = Object.values(body.resolved).reduce((a, b) => a + b, 0);
      toast.success(
        `Scanned ${body.scanned} pending order(s): ${resolvedTotal} resolved, ${body.invoicesRepaired} invoice(s) repaired, ${body.held} held for review.`,
      );
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={running} className="gap-1.5">
      <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
      {running ? "Reconciling…" : "Reconcile pending"}
    </Button>
  );
}
