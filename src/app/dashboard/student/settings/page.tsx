import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";
import { DeleteAccountCard } from "./delete-account-card";

export default async function StudentSettingsPage() {
  const session = await auth();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account details.</p>
      </div>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your account details, as registered.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{session?.user?.name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{session?.user?.email}</span>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={60}>
        <DeleteAccountCard />
      </Reveal>
    </div>
  );
}
