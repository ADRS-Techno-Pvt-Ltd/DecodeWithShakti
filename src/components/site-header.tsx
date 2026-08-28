"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sections = [
  { hash: "mentor", label: "Your mentor" },
  { hash: "features", label: "Why us" },
  { hash: "how", label: "How it works" },
  { hash: "pricing", label: "Question banks" },
  { hash: "faq", label: "FAQ" },
];

/**
 * The public site navbar. Shown on every page except the admin panel (which keeps
 * its own sidebar shell). Logged-in students get their account links here instead
 * of a sidebar.
 */
export function SiteHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";

  // On the landing page use bare "#hash" so Lenis (SmoothScroll) intercepts it;
  // from anywhere else use "/#hash" to route home first, where its hash handler
  // takes over.
  const onHome = usePathname() === "/";
  const sectionHref = (hash: string) => (onHome ? `#${hash}` : `/#${hash}`);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-7 2xl:max-w-[1440px]">
        <BrandLogo imgClassName="h-7 w-auto sm:h-8 shrink-0" />

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex xl:gap-7">
          <Link href="/" className="hover:text-primary whitespace-nowrap">
            Home
          </Link>
          {sections.map((s) => (
            <Link key={s.hash} href={sectionHref(s.hash)} className="hover:text-primary whitespace-nowrap">
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted sm:px-2.5">
                <span className="truncate max-w-[100px] sm:max-w-none">{user.name ?? "Account"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.email && <DropdownMenuItem disabled>{user.email}</DropdownMenuItem>}
                <DropdownMenuItem
                  render={
                    <Link href={isAdmin ? "/dashboard/admin" : "/dashboard/student"}>
                      <LayoutDashboard />
                      {isAdmin ? "Admin dashboard" : "Dashboard"}
                    </Link>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              className="h-9 px-3 text-sm sm:px-4"
              render={<Link href="/login">Log in</Link>}
            />
          )}
          <Button
            className="h-9 px-3 text-sm shadow-sm sm:px-5"
            render={<Link href="/question-banks"><span className="hidden sm:inline">Browse banks</span><span className="sm:hidden">Browse</span></Link>}
          />
        </div>
      </div>
    </header>
  );
}
