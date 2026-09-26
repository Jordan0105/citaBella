import type { EmployeeDTO } from "../types";

/** Select canónico de trabajadoras (usar con .from("employees")). */
export const EMPLOYEE_SELECT =
  "id, full_name, specialty, color, commission_pct, phone, is_active" as const;

/** Fila Supabase (snake_case) → DTO camelCase serializable. */
export function mapEmployee(row: Record<string, unknown>): EmployeeDTO {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    specialty: (row.specialty as string | null) ?? null,
    color: row.color as string,
    commissionPct: (row.commission_pct as number | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    isActive: row.is_active as boolean,
  };
}
