"use client";

import { useEffect, useState } from "react";

type CashfreeCheckoutResult = {
  error?: { message?: string };
  redirect?: boolean;
  paymentDetails?: unknown;
};

export type CashfreeInstance = {
  checkout(options: { paymentSessionId: string; redirectTarget?: "_modal" | "_self" | "_top" | "_blank" }): Promise<CashfreeCheckoutResult>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: string }) => CashfreeInstance;
  }
}

const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
let loadPromise: Promise<void> | null = null;

function loadScriptOnce(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Cashfree) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree checkout SDK."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Loads Cashfree.js v3 via script tag (there is no npm package for the
 * client-side SDK) and initializes it once. See docs/CASHFREE-PLAN.md § 6.
 */
export function useCashfreeSdk(): CashfreeInstance | null {
  const [instance, setInstance] = useState<CashfreeInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScriptOnce()
      .then(() => {
        if (cancelled || !window.Cashfree) return;
        const mode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox";
        setInstance(window.Cashfree({ mode }));
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, []);

  return instance;
}
