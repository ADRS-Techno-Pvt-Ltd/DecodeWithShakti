import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDashboardLoading() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
