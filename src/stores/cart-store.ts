import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Mirrors the `ProductType` enum (`prisma/schema.prisma`) without importing
 *  generated Prisma types into client bundles. */
export type CartItemType = "QUESTION_BANK" | "TEST_SERIES" | "MENTORSHIP";

export type CartItem = {
  questionBankId: string;
  title: string;
  /** Effective price in paise at the time it was added — display only. The
   *  actual charge is always recomputed server-side from live DB prices
   *  (see `/api/v1/cart/preview` and `/api/v1/cart/create-order`); never
   *  trust this value for anything but an optimistic UI render. */
  price: number;
  thumbnailPath: string | null;
  type: CartItemType;
};

type CartState = {
  items: CartItem[];
  /** Adds an item, or replaces the existing entry if the same
   *  `questionBankId` is already present (one-time entitlements, no
   *  quantities — re-adding just refreshes the snapshot). */
  addItem: (item: CartItem) => void;
  removeItem: (questionBankId: string) => void;
  clear: () => void;
  has: (questionBankId: string) => boolean;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [...state.items.filter((i) => i.questionBankId !== item.questionBankId), item],
        })),
      removeItem: (questionBankId) =>
        set((state) => ({
          items: state.items.filter((i) => i.questionBankId !== questionBankId),
        })),
      clear: () => set({ items: [] }),
      has: (questionBankId) => get().items.some((i) => i.questionBankId === questionBankId),
    }),
    {
      name: "cart-store",
      // The server always renders with `items: []` (no localStorage access). Reading
      // persisted state synchronously on the client would make the very first client
      // render diverge from that SSR-ed HTML and trip a hydration mismatch, so
      // hydration is skipped here and triggered manually post-mount instead — see
      // `<CartHydration>` in `src/app/providers.tsx`.
      skipHydration: true,
    },
  ),
);

/** Convenience selector-friendly helpers for the header badge etc. */
export function cartCount(items: CartItem[]): number {
  return items.length;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price, 0);
}
