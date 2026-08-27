import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-7 py-10 2xl:max-w-[1440px]">{children}</main>
    </>
  );
}
