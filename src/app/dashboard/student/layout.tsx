import { redirect } from "next/navigation";
import { FileCheck2, LayoutDashboard, ShoppingBag, UserRound, Video } from "lucide-react";
import { auth } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";

const navItems: NavItem[] = [
  { href: "/dashboard/student", label: "Overview", icon: <LayoutDashboard /> },
  { href: "/dashboard/student/purchases", label: "My Purchases", icon: <ShoppingBag /> },
  { href: "/dashboard/student/videos", label: "Videos", icon: <Video /> },
  { href: "/dashboard/student/answer-sheets", label: "Uploads / Evaluated Answer", icon: <FileCheck2 /> },
  { href: "/dashboard/student/settings", label: "Account Settings", icon: <UserRound /> },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  return (
    <>
      {session.user.impersonatorId && (
        <ImpersonationBanner targetName={session.user.name ?? "user"} />
      )}
      <DashboardShell
        navItems={navItems}
        userName={session.user.name ?? "Student"}
        userEmail={session.user.email ?? ""}
        roleLabel={session.user.impersonatorId ? "Student (admin view)" : "Student"}
      >
        {children}
      </DashboardShell>
    </>
  );
}
