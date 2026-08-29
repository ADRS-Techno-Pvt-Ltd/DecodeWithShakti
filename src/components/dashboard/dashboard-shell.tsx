"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

function DashboardShellContent({
  navItems,
  userName,
  userEmail,
  roleLabel,
  children,
}: {
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const activeHref = navItems
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const handleNavClick = () => {
    // Close sidebar on mobile when a nav item is clicked
    if (isClient && isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            {/* Full lockup (matches the site header) when expanded, icon-only mark when collapsed. */}
            <BrandLogo
              href={null}
              variant="lockup"
              imgClassName="h-7 w-auto group-data-[collapsible=icon]:hidden"
            />
            <BrandLogo
              href={null}
              variant="mark"
              imgClassName="hidden h-7 w-7 shrink-0 group-data-[collapsible=icon]:block"
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={item.href === activeHref}
                      tooltip={item.label}
                      size="lg"
                      className="group-data-[collapsible=icon]:justify-center"
                      render={
                        <Link href={item.href} onClick={handleNavClick} className="flex items-center gap-2">
                          {item.icon}
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Log out"
                size="lg"
                className="group-data-[collapsible=icon]:justify-center"
                onClick={() => signOut({ callbackUrl: "/" })}
                render={
                  <button className="flex items-center gap-2">
                    <LogOut />
                    <span className="group-data-[collapsible=icon]:hidden">Log out</span>
                  </button>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
          <SidebarTrigger />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                  {userName
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left text-sm">
                <div className="font-semibold">{userName}</div>
                <div className="text-muted-foreground text-xs">{roleLabel}</div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>{userEmail}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="bg-background flex-1 p-4 sm:p-6 lg:p-7 overflow-x-hidden min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-w-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
    </>
  );
}

export function DashboardShell({
  navItems,
  userName,
  userEmail,
  roleLabel,
  children,
}: {
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <SidebarProvider defaultOpen={true}>
        <DashboardShellContent
          navItems={navItems}
          userName={userName}
          userEmail={userEmail}
          roleLabel={roleLabel}
        >
          {children}
        </DashboardShellContent>
      </SidebarProvider>
    </MotionConfig>
  );
}
