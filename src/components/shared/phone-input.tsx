"use client";

import { useId } from "react";

interface PhoneInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "type"
> {
  value: string;
  onValueChange: (value: string) => void;
}

/** Teléfono Nicaragua: prefijo +505 fijo, 8 dígitos (2/7/8). */
export function PhoneInput({
  value,
  onValueChange,
  className,
  ...props
}: PhoneInputProps) {
  const id = useId();

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
      >
        +505
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={9}
        placeholder="8412 3456"
        className={`h-9 w-full rounded-xl border border-input bg-transparent px-14 py-1 text-base tabular-nums shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 ${className ?? ""}`}
        value={value}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, ""))}
        {...props}
      />
    </div>
  );
}
