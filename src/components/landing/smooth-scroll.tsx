"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Sticky header height + a little breathing room, so anchored sections
// don't land tucked under the nav bar.
const NAV_OFFSET = -84;

/** Smooth scrolling for the marketing pages only. Skips entirely under prefers-reduced-motion. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Same-page hash links (nav, hero, footer) jump via the browser's native
    // scrollIntoView by default, which fights Lenis's virtualized scroll
    // position and lands on the wrong section. Route them through Lenis instead.
    function scrollToHash(hash: string) {
      const target = document.querySelector(hash);
      if (target) lenis.scrollTo(target as HTMLElement, { offset: NAV_OFFSET });
    }

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#" || !document.querySelector(hash)) return;
      e.preventDefault();
      e.stopPropagation();
      history.pushState(null, "", hash);
      scrollToHash(hash);
    }
    document.addEventListener("click", onClick, { capture: true });

    // Landing directly on a hash (e.g. /#faq from another page).
    if (window.location.hash) {
      requestAnimationFrame(() => scrollToHash(window.location.hash));
    }

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
