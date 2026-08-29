"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { updateEmailSchema, type UpdateEmailInput } from "@/lib/validation/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateEmailInput>({
    resolver: zodResolver(updateEmailSchema),
  });

  async function onSubmit(data: UpdateEmailInput) {
    setSubmitting(true);
    
    try {
      const response = await fetch("/api/v1/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to update email");
        setSubmitting(false);
        return;
      }

      toast.success("Email updated successfully! Please log in again.");
      setIsOpen(false);
      reset();
      
      // Sign out user so they can log in with new email
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 1500);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setIsOpen(false);
    reset();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Address</CardTitle>
          <CardDescription>Change the email address associated with your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="text-muted-foreground">Email: </span>
              <span className="font-medium break-all">{currentEmail}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="shrink-0">
              Change Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold">Change Email Address</DialogTitle>
            <DialogDescription className="text-sm">
              You'll need to log in again after changing your email.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="currentEmail" className="text-sm font-medium">
                Current Email
              </Label>
              <Input
                id="currentEmail"
                type="email"
                value={currentEmail}
                disabled
                className="h-11 bg-muted text-[15px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail" className="text-sm font-medium">
                New Email
              </Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="Enter your new email"
                className="h-11 text-[15px]"
                {...register("newEmail")}
                disabled={submitting}
              />
              {errors.newEmail && (
                <p className="text-destructive text-xs mt-1">{errors.newEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Confirm Password
              </Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                className="h-11 text-[15px]"
                {...register("password")}
                disabled={submitting}
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2.5 pt-4 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
                className="h-auto flex-1 py-3 text-base sm:h-11 sm:flex-1 sm:py-0 sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-auto flex-1 py-3 text-base sm:h-11 sm:flex-1 sm:py-0 sm:text-sm"
              >
                {submitting ? "Updating..." : "Update Email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
