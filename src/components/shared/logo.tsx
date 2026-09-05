import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Sparkles
          className="h-4 w-4 text-bella-600 dark:text-bella-400"
          aria-hidden
        />
      </span>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight">
          CitaBella
        </span>
      )}
    </span>
  );
}
