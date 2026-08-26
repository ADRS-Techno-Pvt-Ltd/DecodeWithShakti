"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormInput = z.infer<typeof formSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(formSchema) });

  async function onSubmit(data: FormInput) {
    setSubmitting(true);
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "This reset link is invalid or has expired.");
      return;
    }

    toast.success("Password updated — please log in.");
    router.push("/login");
  }

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="text-2xl">Set a new password</CardTitle>
        <CardDescription>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <PasswordInput id="password" className="h-11 px-3.5 text-[15px]" {...register("password")} />
            {errors.password && (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" disabled={submitting} className="h-11 w-full text-[15px]">
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
