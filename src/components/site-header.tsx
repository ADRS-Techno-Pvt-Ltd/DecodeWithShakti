"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut, Settings, ShoppingBag } from "lucide-react";
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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-7 py-4 2xl:max-w-[1440px]">
        <BrandLogo imgClassName="h-8 w-auto" />

        <nav className="hidden items-center gap-7 text-[14.5px] font-medium text-muted-foreground lg:flex">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          {sections.map((s) => (
            <Link key={s.hash} href={sectionHref(s.hash)} className="hover:text-primary">
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[14.5px] font-medium hover:bg-muted">
                {user.name ?? "Account"}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.email && <DropdownMenuItem disabled>{user.email}</DropdownMenuItem>}
                {isAdmin ? (
                  <DropdownMenuItem
                    render={
                      <Link href="/dashboard/admin">
                        <LayoutDashboard />
                        Admin dashboard
                      </Link>
                    }
                  />
                ) : (
                  <>
                    <DropdownMenuItem
                      render={
                        <Link href="/dashboard/student">
                          <ShoppingBag />
                          My purchases
                        </Link>
                      }
                    />
                    <DropdownMenuItem
                      render={
                        <Link href="/dashboard/student/settings">
                          <Settings />
                          Account settings
                        </Link>
                      }
                    />
                  </>
                )}
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
              className="h-9 px-4"
              render={<Link href="/login">Log in</Link>}
            />
          )}
          <Button
            className="h-9 px-5 shadow-sm"
            render={<Link href="/question-banks">Browse banks</Link>}
          />
        </div>
      </div>
    </header>
  );
}
