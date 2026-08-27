"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirects to `href` after `delayMs` — used on the success card so the
 *  student lands on My Purchases without needing to click through. A pending
 *  file download (triggered by a real <a> tag) keeps running in the
 *  background regardless of this navigation. */
export function AutoRedirect({ href, delayMs = 4000 }: { href: string; delayMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push(href), delayMs);
    return () => clearTimeout(timer);
  }, [href, delayMs, router]);

  return null;
}
