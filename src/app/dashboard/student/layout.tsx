import { redirect } from "next/navigation";
import { Home, BookOpen, FileQuestion, GraduationCap } from "lucide-react";
import { auth } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";

const navItems: NavItem[] = [
  { href: "/dashboard/student", label: "My Purchases", icon: <Home /> },
  { href: "/question-banks", label: "Browse Question Banks", icon: <BookOpen /> },
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
      brand="CA ExamBank"
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
