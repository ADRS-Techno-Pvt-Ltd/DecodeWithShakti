"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown at the top of every dashboard page while an admin is viewing a user's
 * account via "View as user". "Exit" restores the admin session (see the
 * `stop-impersonate` provider in src/lib/auth.ts).
 */
export function ImpersonationBanner({ targetName }: { targetName: string }) {
  const [exiting, setExiting] = useState(false);

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="h-4 w-4" />
        Viewing as <strong>{targetName}</strong> — checkout and account changes are disabled.
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={exiting}
        className="h-7 border-amber-950/30 bg-white/70 text-amber-950 hover:bg-white"
        onClick={() => {
          setExiting(true);
          signIn("stop-impersonate", { redirectTo: "/dashboard/admin/users" });
        }}
      >
        {exiting ? "Exiting…" : "Exit"}
      </Button>
    </div>
  );
}
