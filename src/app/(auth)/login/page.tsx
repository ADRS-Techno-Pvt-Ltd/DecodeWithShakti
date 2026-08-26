"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, getSession } from "next-auth/react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setSubmitting(true);
    const result = await signIn("credentials", { ...data, redirect: false });
    setSubmitting(false);

    if (result?.error) {
      toast.error("Invalid email or password.");
      return;
    }

    const session = await getSession();
    router.push(session?.user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student");
  }

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="text-2xl">Log in to Decode with Shakti</CardTitle>
        <CardDescription>Access your purchases and question banks.</CardDescription>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className="h-11 px-3.5 text-[15px]" {...register("email")} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" className="h-11 px-3.5 text-[15px]" {...register("password")} />
            {errors.password && (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            )}
          </div>
          <div className="text-right text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" disabled={submitting} className="h-11 w-full text-[15px]">
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-5 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
