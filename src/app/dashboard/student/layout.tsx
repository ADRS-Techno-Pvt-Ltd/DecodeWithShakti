import { redirect } from "next/navigation";
import { Home, BookOpen, FileQuestion, GraduationCap, Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";

const navItems: NavItem[] = [
  { href: "/dashboard/student", label: "My Purchases", icon: <Home /> },
  { href: "/question-banks", label: "Browse Question Banks", icon: <BookOpen /> },
  { href: "/dashboard/student/settings", label: "Account Settings", icon: <Settings /> },
];

const comingSoonItems: NavItem[] = [
  { href: "#", label: "My Quizzes", icon: <FileQuestion /> },
  { href: "#", label: "My Courses", icon: <GraduationCap /> },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  return (
    <DashboardShell
      brand="Decode with Shakti"
      navItems={navItems}
      comingSoonItems={comingSoonItems}
      userName={session.user.name ?? "Student"}
      userEmail={session.user.email ?? ""}
      roleLabel="Student"
    >
      {children}
    </DashboardShell>
  );
}
