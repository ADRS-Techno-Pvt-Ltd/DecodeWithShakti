"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPublishedBanners } from "@/features/banners/api";
import type { Banner } from "@/features/banners/types";

/** Published homepage carousel banners in display order. Empty while loading or if none are set. */
export function useBanners(): { banners: Banner[]; loading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: ["banners", "published"],
    queryFn: fetchPublishedBanners,
  });

  return { banners: data ?? [], loading: isPending };
}
