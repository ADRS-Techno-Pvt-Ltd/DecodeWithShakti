import { redirect } from "next/navigation";
import { ShoppingBag, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";

const navItems: NavItem[] = [
  { href: "/dashboard/student", label: "My Purchases", icon: <ShoppingBag /> },
  { href: "/dashboard/student/settings", label: "Account Settings", icon: <UserRound /> },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  return (
    <DashboardShell
      brand="Decode with Shakti"
      navItems={navItems}
      userName={session.user.name ?? "Student"}
      userEmail={session.user.email ?? ""}
      roleLabel="Student"
    >
      {children}
    </DashboardShell>
  );
}
