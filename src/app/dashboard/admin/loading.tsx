import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminOverviewLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-2 h-4 w-64" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
