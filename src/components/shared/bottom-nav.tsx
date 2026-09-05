"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navigation";

interface BottomNavProps {
  isOwner: boolean;
  className?: string;
}

export function BottomNav({ isOwner, className }: BottomNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => item.mobile && (!item.ownerOnly || isOwner),
  ).slice(0, 5);

  return (
    <nav
      aria-label="Navegación móvil"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 backdrop-blur",
        className,
      )}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium",
              active
                ? "text-bella-600 dark:text-bella-400"
                : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
