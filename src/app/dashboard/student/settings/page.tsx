import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";
import { ChangeEmailCard } from "./change-email-card";
import { DeleteAccountCard } from "./delete-account-card";

export default async function StudentSettingsPage() {
  const session = await auth();

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="mb-4 sm:mb-6 max-w-2xl">
        <h1 className="font-heading text-xl sm:text-2xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account details.</p>
      </div>

      <div className="flex max-w-2xl flex-col gap-5 sm:gap-6">
        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Your account details, as registered.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium truncate">{session?.user?.name}</span>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={60}>
          <ChangeEmailCard currentEmail={session?.user?.email || ""} />
        </Reveal>

        <Reveal delay={120}>
          <DeleteAccountCard />
        </Reveal>
      </div>
    </div>
  );
}
