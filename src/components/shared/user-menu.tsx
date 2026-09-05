"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions/sign-out";
import type { AuthRole } from "@/features/auth/queries/get-auth-context";

const ROLE_LABELS: Record<AuthRole, string> = {
  owner: "Dueña",
  worker: "Trabajadora",
  receptionist: "Recepcionista",
};

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface UserMenuProps {
  fullName: string;
  role: AuthRole;
}

export function UserMenu({ fullName, role }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="rounded-full outline-ring/50 focus-visible:ring-2"
      >
        <Avatar className="h-9 w-9 border">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-bella-700 dark:text-bella-300">
            {initials(fullName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{fullName}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void signOut();
          }}
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
