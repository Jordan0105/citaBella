import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-bella-500" aria-hidden />}
        </div>
        <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card className="shadow-soft">
      <CardContent className="space-y-2 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}
