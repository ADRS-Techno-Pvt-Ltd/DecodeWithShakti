"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useCartStore } from "@/stores/cart-store";

/** Triggers the cart store's deferred localStorage rehydration once mounted
 *  (see `skipHydration` in cart-store.ts) — always after the SSR-matching
 *  first render, never during it, so this never causes a hydration mismatch. */
function CartHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <SessionProvider basePath="/api/v1/auth">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CartHydration />
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
