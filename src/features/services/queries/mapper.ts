import type { ServiceDTO } from "../types";

/** Select canónico de servicios (usar con .from("services")). */
export const SERVICE_SELECT =
  "id, name, description, price_nio, price_usd, duration_minutes, commission_pct, is_active" as const;

/** Fila Supabase (snake_case) → DTO camelCase serializable. */
export function mapService(row: Record<string, unknown>): ServiceDTO {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    priceNio: Number(row.price_nio),
    priceUsd: Number(row.price_usd),
    durationMinutes: row.duration_minutes as number,
    commissionPct: (row.commission_pct as number | null) ?? null,
    isActive: row.is_active as boolean,
  };
}
