"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./navigation";

interface AppSidebarProps {
  isOwner: boolean;
  className?: string;
}

export function AppSidebar({ isOwner, className }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex-col border-r bg-sidebar", className)}>
      <div className="p-4">
        <Logo />
      </div>
      <nav aria-label="Navegación principal" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-bella-700 dark:text-bella-300"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-4 pb-4 text-xs text-muted-foreground">
        CitaBella · Fase 1
      </p>
    </aside>
  );
}
