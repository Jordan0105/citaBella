import type { ClientDTO } from "../types";

/** Select canónico de clientes (usar con .from("clients")). */
export const CLIENT_SELECT =
  "id, full_name, phone, whatsapp, email, birth_date, notes" as const;

/** Fila Supabase (snake_case) → DTO camelCase serializable. */
export function mapClient(row: Record<string, unknown>): ClientDTO {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    phone: row.phone as string,
    whatsapp: (row.whatsapp as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    birthDate: (row.birth_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}
