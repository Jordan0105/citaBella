"use client";

import { Banknote, CreditCard, Landmark, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "transfer" | "card";

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "transfer", label: "Transferencia", icon: Landmark },
  { value: "card", label: "Tarjeta", icon: CreditCard },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onValueChange: (value: PaymentMethod) => void;
}

export function PaymentMethodSelector({
  value,
  onValueChange,
}: PaymentMethodSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Método de pago"
      className="grid grid-cols-3 gap-2"
    >
      {PAYMENT_METHODS.map((method) => {
        const active = value === method.value;
        return (
          <button
            key={method.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(method.value)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary/10 text-bella-700 dark:text-bella-300"
                : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <method.icon className="h-4 w-4" aria-hidden />
            {method.label}
          </button>
        );
      })}
    </div>
  );
}
