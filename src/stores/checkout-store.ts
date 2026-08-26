import { create } from "zustand";

type CheckoutState = {
  couponCode: string;
  setCouponCode: (code: string) => void;
  reset: () => void;
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  couponCode: "",
  setCouponCode: (code) => set({ couponCode: code }),
  reset: () => set({ couponCode: "" }),
}));
