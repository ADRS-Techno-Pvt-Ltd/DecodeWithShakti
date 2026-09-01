"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/features/banners/types";

const AUTOPLAY_MS = 5500;
// Matches BANNER_CROP_ASPECT in banner-image-crop-dialog.tsx — every uploaded banner is
// already cropped to this ratio, so sizing the row to it means object-cover fills it
// exactly with no crop and no leftover white space, at any screen width.
const ROW_ASPECT = "aspect-[1284/220]";

/**
 * 44px sliver of the previous/next slide, cropped to its near edge so it reads as
 * "more content this way" — clicking it navigates the main carousel to that slide.
 * Hidden on mobile: at narrow widths the peeks skew the row away from the banner's
 * native aspect ratio, which is what caused cropped/letterboxed banners there.
 */
function Peek({ banner, side, onClick }: { banner: Banner; side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous slide" : "Next slide"}
      className="group hidden h-full w-6 shrink-0 overflow-hidden rounded-lg bg-white sm:block md:w-11"
    >
      <img
        src={banner.imagePath}
        alt=""
        className="h-full w-full object-cover opacity-60 transition-opacity duration-200 group-hover:opacity-90"
        style={{ objectPosition: side === "left" ? "right center" : "left center" }}
      />
    </button>
  );
}

/**
 * Pure-image carousel for the homepage, above the hero. No headline/pill/CTA text is
 * rendered on the slides — each one is just the admin-uploaded photo, optionally
 * click-through via `linkUrl`. The 44px edges automatically peek the previous/next
 * slide (clicking one navigates there) — there's no separate side content to manage.
 * Renders nothing while loading or if no banner is published, so the hero stays the
 * true top of the page for sites with no banners configured.
 */
export function BannerCarousel({ banners, loading }: { banners: Banner[]; loading: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Clamp during render rather than resetting via an effect — `banners.length` can shrink
  // (e.g. a banner gets unpublished) between renders while `index` still points past the end.
  const safeIndex = index < banners.length ? index : 0;

  useEffect(() => {
    if (paused || banners.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, banners.length]);

  if (loading) {
    return (
      <section className="pt-6">
        <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-7">
          <div className={`w-full animate-pulse rounded-lg bg-muted ${ROW_ASPECT}`} />
        </div>
      </section>
    );
  }

  if (banners.length === 0) return null;

  const current = banners[safeIndex];
  const hasMultiple = banners.length > 1;
  const prev = hasMultiple ? banners[(safeIndex - 1 + banners.length) % banners.length] : null;
  const next = hasMultiple ? banners[(safeIndex + 1) % banners.length] : null;

  function go(direction: -1 | 1) {
    setIndex((safeIndex + direction + banners.length) % banners.length);
  }

  const slide = (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={current.imagePath}
            alt={current.altText}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <section className="pt-6">
      <div className="mx-auto max-w-6xl 2xl:max-w-[1440px] px-5 sm:px-7">
        <div className={`flex gap-1.5 ${ROW_ASPECT}`}>
          {prev && <Peek banner={prev} side="left" onClick={() => go(-1)} />}

          <div
            className="group relative min-w-0 flex-1 overflow-hidden rounded-lg bg-white"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {current.linkUrl ? (
              <Link
                href={current.linkUrl}
                aria-label={current.altText || "Banner"}
                className="block h-full w-full"
              >
                {slide}
              </Link>
            ) : (
              slide
            )}

            {hasMultiple && (
              <>
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={() => go(-1)}
                  className="absolute top-1/2 left-3 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={() => go(1)}
                  className="absolute top-1/2 right-3 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="absolute bottom-3.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                  {banners.map((b, i) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => setIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === safeIndex ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {next && <Peek banner={next} side="right" onClick={() => go(1)} />}
        </div>
      </div>
    </section>
  );
}
