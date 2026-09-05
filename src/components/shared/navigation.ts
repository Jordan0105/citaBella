import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Scissors,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Solo visible/permitido para owner. */
  ownerOnly?: boolean;
  /** Aparece en la navegación inferior móvil. */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, mobile: true },
  { href: "/calendar", label: "Agenda", icon: CalendarDays, mobile: true },
  { href: "/clients", label: "Clientes", icon: Users, mobile: true },
  { href: "/appointments", label: "Citas", icon: ClipboardList, mobile: true },
  { href: "/employees", label: "Trabajadoras", icon: Scissors },
  { href: "/services", label: "Servicios", icon: Sparkles },
  {
    href: "/finance",
    label: "Caja",
    icon: Wallet,
    ownerOnly: true,
    mobile: true,
  },
  { href: "/reports", label: "Reportes", icon: BarChart3, ownerOnly: true },
  { href: "/settings", label: "Ajustes", icon: Settings, ownerOnly: true },
];
