import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AppointmentStatus =
  "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En proceso",
  completed: "Realizada",
  cancelled: "Cancelada",
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending:
    "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
  confirmed:
    "bg-lavanda-100 text-[#4A3F6B] border-lavanda-200 dark:bg-[#3A3149] dark:text-lavanda-300 dark:border-[#4A3F63]",
  in_progress:
    "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-900",
  completed:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900",
  cancelled: "bg-muted text-muted-foreground border-border line-through",
};

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full", STATUS_STYLES[status], className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
