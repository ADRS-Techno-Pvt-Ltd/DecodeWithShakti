import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tones = {
  success: "border-transparent bg-success/10 text-success",
  warning: "border-transparent bg-warning/10 text-warning",
  destructive: "border-transparent bg-destructive/10 text-destructive",
  muted: "border-transparent bg-muted text-muted-foreground",
} as const;

export function StatusBadge({
  tone,
  className,
  children,
}: {
  tone: keyof typeof tones;
  className?: string;
  children: React.ReactNode;
}) {
  return <Badge className={cn(tones[tone], className)}>{children}</Badge>;
}
