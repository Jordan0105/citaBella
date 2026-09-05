"use client";

import { useId } from "react";
import type { CurrencyCode } from "@/lib/money";

interface MoneyInputProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "onChange" | "value"
> {
  value: string;
  onValueChange: (value: string) => void;
  currency?: CurrencyCode;
}

const SYMBOLS: Record<CurrencyCode, string> = { NIO: "C$", USD: "$" };

/** Input de dinero: símbolo de moneda fuera del campo, teclado decimal. */
export function MoneyInput({
  value,
  onValueChange,
  currency = "NIO",
  className,
  ...props
}: MoneyInputProps) {
  const id = useId();

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
      >
        {SYMBOLS[currency]}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={`h-9 w-full rounded-xl border border-input bg-transparent px-8 py-1 text-base tabular-nums shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 ${className ?? ""}`}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        {...props}
      />
    </div>
  );
}
