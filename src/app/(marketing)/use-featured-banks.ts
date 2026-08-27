"use client";

import { useQuery } from "@tanstack/react-query";

export type FeaturedBankCard = {
  category: string;
  title: string;
  desc: string;
  oldPrice: string | null;
  price: string;
  badge: { label: string; tone: "gold" | "green" };
  /** ISO deadline while an early-bird price is live, else null — drives the countdown badge. */
  earlyBirdEndsAt: string | null;
  thumbnailUrl: string | null;
  bullets: string[];
  popular: boolean;
  href: string;
};

type ApiBank = {
  slug: string;
  title: string;
  description: string;
  category: { name: string };
  price: number;
  earlyBirdPrice: number | null;
  earlyBirdEndsAt: string | null;
  thumbnailUrl: string | null;
  features: string[];
};

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100)}`;
}

function earlyBirdLabel(endsAt: string | null): string {
  if (!endsAt) return "Early bird";
  const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Early bird";
  if (days === 1) return "Early bird · ends tomorrow";
  return `Early bird · ends in ${days} days`;
}

function toCard(bank: ApiBank): FeaturedBankCard {
  const earlyActive =
    bank.earlyBirdPrice != null &&
    bank.earlyBirdEndsAt != null &&
    Date.now() < new Date(bank.earlyBirdEndsAt).getTime();
  const effective = earlyActive ? bank.earlyBirdPrice! : bank.price;

  return {
    category: bank.category.name,
    title: bank.title,
    desc: bank.description,
    oldPrice: earlyActive ? rupees(bank.price) : null,
    price: rupees(effective),
    badge: earlyActive
      ? { label: earlyBirdLabel(bank.earlyBirdEndsAt), tone: "gold" }
      : { label: "Regular price", tone: "green" },
    earlyBirdEndsAt: earlyActive ? bank.earlyBirdEndsAt : null,
    thumbnailUrl: bank.thumbnailUrl,
    bullets: bank.features,
    popular: false,
    href: `/question-banks/${bank.slug}`,
  };
}

/**
 * Returns the cards to render in the landing "Priced per bank" section: the admin-featured
 * question banks when any exist, otherwise the curated static `fallback`. `loading` is true
 * only on the first fetch — render a skeleton then so the static fallback never flashes
 * before the real featured banks arrive.
 */
export function useFeaturedBanks(fallback: FeaturedBankCard[]): {
  banks: FeaturedBankCard[];
  loading: boolean;
} {
  const { data, isPending } = useQuery({
    queryKey: ["featured-banks"],
    queryFn: async (): Promise<ApiBank[]> => {
      const res = await fetch("/api/v1/question-banks?featured=true");
      if (!res.ok) throw new Error("Failed to load featured banks");
      return res.json();
    },
  });

  if (isPending) return { banks: [], loading: true };
  if (!data || data.length === 0) return { banks: fallback, loading: false };
  return { banks: data.map(toCard), loading: false };
}
