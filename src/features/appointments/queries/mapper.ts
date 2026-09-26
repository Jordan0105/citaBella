import type { AppointmentDTO } from "../types";

/** Select canónico de citas con joins (usar con .from("appointments")). */
export const APPOINTMENT_SELECT = `*,
  client:clients ( id, full_name, phone ),
  employee:employees ( id, full_name, color ),
  services:appointment_services (
    id, service_id, price, discount, duration_minutes,
    service:services ( id, name )
  )` as const;

export type AppointmentRow = {
  id: string;
  client_id: string;
  employee_id: string;
  starts_at: string;
  ends_at: string;
  actual_end_at: string | null;
  completed_at: string | null;
  status: AppointmentDTO["status"];
  currency: AppointmentDTO["currency"];
  price: number | string;
  discount: number | string;
  notes: string | null;
  client?: { id: string; full_name: string; phone: string | null } | null;
  employee?: { id: string; full_name: string; color: string } | null;
  services?: {
    id: string;
    service_id: string;
    price: number | string;
    discount: number | string;
    duration_minutes: number;
    service?: { id: string; name: string } | null;
  }[];
};

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** Fila Supabase (snake_case) → DTO camelCase serializable. */
export function mapAppointmentRow(row: AppointmentRow): AppointmentDTO {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client?.full_name ?? "Cliente",
    clientPhone: row.client?.phone ?? null,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? "Trabajadora",
    employeeColor: row.employee?.color ?? "#B7A6E3",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    actualEndAt: row.actual_end_at,
    completedAt: row.completed_at,
    status: row.status,
    currency: row.currency,
    price: toNumber(row.price),
    discount: toNumber(row.discount),
    notes: row.notes,
    services: (row.services ?? []).map((line) => ({
      id: line.id,
      serviceId: line.service_id,
      serviceName: line.service?.name ?? "Servicio",
      price: toNumber(line.price),
      discount: toNumber(line.discount),
      durationMinutes: line.duration_minutes,
    })),
  };
}
