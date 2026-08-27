import { redirect } from "next/navigation";
import { LayoutDashboard, BookOpen, Tag, Wallet, HelpCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";

const navItems: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: <LayoutDashboard /> },
  { href: "/dashboard/admin/question-banks", label: "Question Banks", icon: <BookOpen /> },
  { href: "/dashboard/admin/coupons", label: "Coupons", icon: <Tag /> },
  { href: "/dashboard/admin/sales", label: "Sales", icon: <Wallet /> },
  { href: "/dashboard/admin/faqs", label: "FAQ", icon: <HelpCircle /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <DashboardShell
      navItems={navItems}
      userName={session.user.name ?? "Admin"}
      userEmail={session.user.email ?? ""}
      roleLabel="Administrator"
    >
      {children}
    </DashboardShell>
  );
}
