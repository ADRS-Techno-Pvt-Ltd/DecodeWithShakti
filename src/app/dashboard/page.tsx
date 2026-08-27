import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Bare /dashboard always means the student panel — nothing in the app links here for
 * admins (login/register and the header dropdown already send admins straight to
 * /dashboard/admin), so this route doesn't need role branching.
 */
export default async function DashboardRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect("/dashboard/student");
}
