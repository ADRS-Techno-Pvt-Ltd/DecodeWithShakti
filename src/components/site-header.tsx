"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
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
  const pathname = usePathname();
  const onHome = pathname === "/";
  const sectionHref = (hash: string) => (onHome ? `#${hash}` : `/#${hash}`);

  // Highlights the nav link for whichever section is currently under the sticky
  // header as the user scrolls. Only meaningful on the landing page itself.
  const [activeHash, setActiveHash] = useState<string | null>(null);

  // Transparent over the hero, solid once the user scrolls into the rest of the
  // page. Only the landing page has a hero worth seeing through — every other
  // route keeps the solid header.
  const [scrolled, setScrolled] = useState(!onHome);

  // While a nav click is driving an in-flight Lenis scroll, skip the
  // position-based recalculation below so the clicked link doesn't flicker
  // through whatever sections it happens to pass on the way there.
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (!onHome) return;
    function onNavStart(e: Event) {
      navigatingRef.current = true;
      const hash = (e as CustomEvent<string>).detail?.replace("#", "") || null;
      setActiveHash(hash);
    }
    function onNavEnd() {
      navigatingRef.current = false;
    }
    window.addEventListener("lenis-hash-start", onNavStart);
    window.addEventListener("lenis-hash-end", onNavEnd);
    return () => {
      window.removeEventListener("lenis-hash-start", onNavStart);
      window.removeEventListener("lenis-hash-end", onNavEnd);
    };
  }, [onHome]);

  useEffect(() => {
    if (!onHome) {
      setScrolled(true);
      setActiveHash(null);
      return;
    }

    // Active section = the last one (in document order) whose top has scrolled
    // above the header. None qualifying (i.e. still above the first section)
    // means we're back at the hero, so "Home" lights up instead.
    const HEADER_OFFSET = 100;
    function onScroll() {
      setScrolled(window.scrollY > 40);
      if (navigatingRef.current) return;

      let current: string | null = null;
      for (const s of sections) {
        const el = document.getElementById(s.hash);
        if (el && el.getBoundingClientRect().top <= HEADER_OFFSET) current = s.hash;
      }
      setActiveHash(current);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onHome]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-7 2xl:max-w-[1440px]">
        <BrandLogo imgClassName="h-7 w-auto sm:h-8 shrink-0" />

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex xl:gap-7">
          <Link
            href="/"
            className={cn(
              "outline-none whitespace-nowrap border-b-2 border-transparent py-0.5 hover:text-primary",
              onHome && activeHash === null && "border-primary font-semibold text-primary",
            )}
          >
            Home
          </Link>
          {sections.map((s) => (
            <Link
              key={s.hash}
              href={sectionHref(s.hash)}
              className={cn(
                "outline-none whitespace-nowrap border-b-2 border-transparent py-0.5 hover:text-primary",
                activeHash === s.hash && "border-primary font-semibold text-primary",
              )}
            >
              {s.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className={cn(
              "outline-none whitespace-nowrap border-b-2 border-transparent py-0.5 hover:text-primary",
              pathname === "/contact" && "border-primary font-semibold text-primary",
            )}
          >
            Contact
          </Link>
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
