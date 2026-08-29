"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, getSession } from "next-auth/react";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    setSubmitting(true);
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not create account.");
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setSubmitting(false);

    if (result?.error) {
      toast.success("Account created — please log in.");
      router.push("/login");
      return;
    }

    const session = await getSession();
    router.push(session?.user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student");
  }

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="text-2xl">Create your student account</CardTitle>
        <CardDescription>Browse, preview and purchase exam-pattern question banks.</CardDescription>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" className="h-11 px-3.5 text-[15px]" {...register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className="h-11 px-3.5 text-[15px]" {...register("email")} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="caRegistrationNumber">CA Registration Number</Label>
            <Input 
              id="caRegistrationNumber" 
              placeholder="e.g., NRO1234567"
              maxLength={10}
              className="h-11 px-3.5 text-[15px]" 
              {...register("caRegistrationNumber")} 
            />
            {errors.caRegistrationNumber && (
              <p className="text-destructive text-xs">{errors.caRegistrationNumber.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" className="h-11 px-3.5 text-[15px]" {...register("password")} />
            {errors.password && (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" disabled={submitting} className="h-11 w-full text-[15px]">
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-5 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
