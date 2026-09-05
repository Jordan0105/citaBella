import { z } from "zod";

export type CurrencyCode = "NIO" | "USD";

/** Monto monetario: finito y no negativo. */
export const moneySchema = z.number().finite().min(0);

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  NIO: "C$",
  USD: "$",
};

const DIGITS_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function toNumber(value: number | string): number {
  const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formatea montos según las reglas de CitaBella:
 * - NIO → "C$ 1,250.00" (con espacio tras el símbolo)
 * - USD → "$25.00" (sin espacio)
 * Valores no finitos se tratan como 0 para no romper la UI.
 */
export function formatMoney(
  amount: number | string,
  currency: CurrencyCode,
): string {
  const n = toNumber(amount);
  const formatted = DIGITS_FORMATTER.format(n);
  return currency === "NIO"
    ? `${CURRENCY_SYMBOLS.NIO} ${formatted}`
    : `${CURRENCY_SYMBOLS.USD}${formatted}`;
}

export function formatPercent(pct: number): string {
  return `${INT_FORMATTER.format(pct)}%`;
}

/** Redondeo comercial half-up a 2 decimales (regla de agents/finance.md). */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Convierte un monto USD a NIO con la tasa snapshot (NIO por USD). */
export function usdToNio(amountUsd: number, exchangeRate: number): number {
  return roundMoney(amountUsd * exchangeRate);
}

/** Convierte un monto NIO a USD con la tasa snapshot (NIO por USD). */
export function nioToUsd(amountNio: number, exchangeRate: number): number {
  return roundMoney(amountNio / exchangeRate);
}

/** Normaliza la entrada de un input de dinero ("1,250.50" → 1250.5). */
export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
