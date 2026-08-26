"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

export function DashboardShell({
  brand,
  navItems,
  comingSoonItems = [],
  userName,
  userEmail,
  roleLabel,
  children,
}: {
  brand: string;
  navItems: NavItem[];
  comingSoonItems?: NavItem[];
  userName: string;
  userEmail: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="font-heading flex items-center gap-2 px-2 py-1.5 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              EB
            </span>
            {brand}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                      render={
                        <Link href={item.href}>
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {comingSoonItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Coming in Phase 2</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {comingSoonItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton disabled className="opacity-45">
                        {item.icon}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
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
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="bg-neutral-50 flex-1 p-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
