import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarEmployeeProps {
  fullName: string;
  color?: string | null;
  className?: string;
}

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AvatarEmployee({
  fullName,
  color,
  className,
}: AvatarEmployeeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={fullName}
    >
      <Avatar
        className="h-6 w-6 border"
        style={color ? { borderColor: color } : undefined}
      >
        <AvatarFallback
          className="text-[10px] font-semibold text-white"
          style={color ? { backgroundColor: color } : undefined}
        >
          {initials(fullName)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm">{fullName}</span>
    </span>
  );
}
