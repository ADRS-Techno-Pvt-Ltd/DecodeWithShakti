"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { Eye, Users as UsersIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Reveal } from "@/components/landing/reveal";
import { fetchAllUsers } from "@/features/users/api";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchAllUsers,
  });
  const [viewingAs, setViewingAs] = useState<string | null>(null);

  function viewAsUser(user: { id: string; name: string }) {
    if (!window.confirm(`Sign in as ${user.name} to see their account? This is logged, and checkout / account changes stay disabled.`)) {
      return;
    }
    setViewingAs(user.id);
    signIn("impersonate", { userId: user.id, redirectTo: "/dashboard/student" });
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">
          View all registered users and their details.
        </p>
      </div>

      <Reveal delay={60}>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !users || users.length === 0 ? (
            <EmptyState
              icon={<UsersIcon />}
              title="No users yet"
              description="Users will appear here when they register."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CA Reg. Number</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead className="text-center">Purchases</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Debug</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.caRegistrationNumber || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.phone || "—"}</TableCell>
                    <TableCell className="text-center">
                      {user.role === "ADMIN" ? (
                        <StatusBadge tone="success">Admin</StatusBadge>
                      ) : (
                        <StatusBadge tone="muted">Student</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{user._count.purchases}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role === "ADMIN" ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={viewingAs === user.id}
                          onClick={() => viewAsUser(user)}
                        >
                          <Eye />
                          {viewingAs === user.id ? "Opening…" : "View as"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Reveal>
    </div>
  );
}
