"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const formSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm"),
});
type FormInput = z.infer<typeof formSchema>;

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(formSchema) });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function onSubmit(data: FormInput) {
    setSubmitting(true);
    const res = await fetch("/api/v1/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Couldn't delete your account. Please try again.");
      return;
    }

    toast.success("Your account has been deleted.");
    setOpen(false);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive text-lg">Delete account</CardTitle>
        <CardDescription>Permanently delete your account. This cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Before you continue</AlertTitle>
          <AlertDescription>
            Your name, email, and login are permanently removed and you&apos;ll be signed out
            immediately. Question banks you&apos;ve already purchased become unrecoverable once
            your account is gone — download anything you still need first.
          </AlertDescription>
        </Alert>

        <Button
          variant="destructive"
          className="w-fit"
          onClick={() => setOpen(true)}
        >
          Delete my account
        </Button>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div
                aria-hidden
                className="bg-destructive/10 text-destructive flex size-11 items-center justify-center rounded-full"
              >
                <TriangleAlert className="size-5" />
              </div>
              <DialogTitle>Permanently delete your account?</DialogTitle>
              <DialogDescription>
                This can&apos;t be undone. Enter your password to confirm.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <ul className="border-destructive/20 bg-destructive/5 text-muted-foreground flex flex-col gap-1.5 rounded-lg border p-3 text-xs">
                <li className="flex gap-2">
                  <span className="text-destructive">&bull;</span>
                  Your name, email, and login are erased immediately.
                </li>
                <li className="flex gap-2">
                  <span className="text-destructive">&bull;</span>
                  Question banks you&apos;ve purchased become unrecoverable.
                </li>
                <li className="flex gap-2">
                  <span className="text-destructive">&bull;</span>
                  You&apos;ll be signed out right away.
                </li>
              </ul>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="delete-password">Password</Label>
                <PasswordInput
                  id="delete-password"
                  autoComplete="current-password"
                  autoFocus
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-destructive text-xs">{errors.password.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={submitting}>
                  {submitting ? "Deleting…" : "Delete account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
