import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard empty-state block for dashboard cards: a circular icon badge, a title,
 * optional description, and an optional action (button/link).
 *
 * `icon` must be a rendered element (e.g. `<BookOpen />`), not a component reference —
 * this renders inside Server Components too, where a bare function prop would crash.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-16 text-center", className)}>
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full [&_svg]:size-6">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
