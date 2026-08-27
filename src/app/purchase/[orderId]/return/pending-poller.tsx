"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

const KNOWN_STATUSES = ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"] as const;
type VerifyResponse = {
  status: (typeof KNOWN_STATUSES)[number];
  failureCode?: string | null;
  failureReason?: string | null;
  heldForReview?: boolean;
};

/** 3s flat — Cashfree's own polling guidance is "3-5s, not faster" (common-mistakes §F2). */
const POLL_DELAYS_MS = Array(20).fill(3000);
const MAX_CONSECUTIVE_ERRORS = 4;

export function PendingPoller({
  purchaseId,
  questionBankTitle,
}: {
  purchaseId: string;
  questionBankTitle: string;
}) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [erroredOut, setErroredOut] = useState(false);
  const attemptRef = useRef(0);
  const errorStreakRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(`/api/v1/purchase/verify/${purchaseId}`, { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as VerifyResponse | null;

        if (res.ok && body?.status && KNOWN_STATUSES.includes(body.status)) {
          errorStreakRef.current = 0;
          if (body.status !== "PENDING") {
            stoppedRef.current = true;
            router.refresh();
            return;
          }
        } else {
          // A malformed/error response — not the same as "still pending".
          // Silently retrying forever on this would leave the student staring
          // at a spinner with no signal something is actually wrong.
          errorStreakRef.current += 1;
          if (errorStreakRef.current >= MAX_CONSECUTIVE_ERRORS) {
            stoppedRef.current = true;
            setErroredOut(true);
            return;
          }
        }
      } catch {
        errorStreakRef.current += 1;
        if (errorStreakRef.current >= MAX_CONSECUTIVE_ERRORS) {
          stoppedRef.current = true;
          setErroredOut(true);
          return;
        }
      }

      const delay = POLL_DELAYS_MS[attemptRef.current] ?? null;
      attemptRef.current += 1;
      if (delay == null) {
        stoppedRef.current = true;
        setTimedOut(true);
        return;
      }
      timer = setTimeout(poll, delay);
    }

    timer = setTimeout(poll, POLL_DELAYS_MS[0]);
    return () => {
      stoppedRef.current = true;
      clearTimeout(timer);
    };
  }, [purchaseId, router]);

  if (erroredOut) {
    return (
      <>
        <div className="mb-4 flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} />
        </div>
        <h1 className="font-heading text-xl font-bold">Couldn&apos;t confirm your payment</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while checking the status. If your card/UPI was charged, this will
          resolve automatically shortly — check My Purchases in a few minutes, or contact support.
        </p>
        <a
          href="/dashboard/student"
          className="mt-6 block w-full rounded-[9px] bg-primary-light py-3 text-center text-[15px] font-medium text-white transition-colors hover:bg-primary"
        >
          Go to My Purchases
        </a>
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" strokeWidth={1.5} />
      </div>
      <h1 className="font-heading text-xl font-bold">
        {timedOut ? "Still confirming your payment" : "Confirming your payment…"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {timedOut
          ? `This is taking longer than usual. We'll update "${questionBankTitle}" in My Purchases as soon as it's confirmed — no need to pay again.`
          : "Hang tight, this only takes a few seconds."}
      </p>
      <a
        href="/dashboard/student"
        className="mt-6 block w-full rounded-[9px] border border-primary/30 py-3 text-center text-[15px] font-medium text-primary-dark transition-colors hover:bg-primary/10"
      >
        Go to My Purchases
      </a>
    </>
  );
}
