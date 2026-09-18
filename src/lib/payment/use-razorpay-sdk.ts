"use client";

import { useEffect, useState } from "react";

export type RazorpayCheckoutOptions = {
  key: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};

export type RazorpayInstance = {
  open(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";
let loadPromise: Promise<void> | null = null;

function loadScriptOnce(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout SDK."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Loads Razorpay Checkout.js via script tag and returns the `Razorpay`
 * constructor once ready. Unlike Cashfree.js, checkout.js only needs
 * { key, order_id } — it pulls amount/currency from the order itself. See
 * use-cashfree-sdk.ts for the equivalent Cashfree loader.
 */
export function useRazorpaySdk(): (new (options: RazorpayCheckoutOptions) => RazorpayInstance) | null {
  const [ctor, setCtor] = useState<(new (options: RazorpayCheckoutOptions) => RazorpayInstance) | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScriptOnce()
      .then(() => {
        if (cancelled || !window.Razorpay) return;
        setCtor(() => window.Razorpay!);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, []);

  return ctor;
}
