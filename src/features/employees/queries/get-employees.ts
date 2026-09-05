import { createClient } from "@/lib/supabase/server";
import type { AvailabilitySlotDTO, EmployeeDTO } from "../types";

const EMPLOYEE_SELECT =
  "id, full_name, specialty, color, commission_pct, phone, is_active" as const;

function mapEmployee(row: Record<string, unknown>): EmployeeDTO {
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

/** Trabajadoras activas (la agenda las necesita, RLS permite select a todos). */
export async function getEmployees(): Promise<EmployeeDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return (data ?? []).map(mapEmployee);
}

/** Horario semanal de una trabajadora. */
export async function getAvailability(
  employeeId: string,
): Promise<AvailabilitySlotDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability")
    .select("weekday, start_time, end_time")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .order("weekday");
  if (error) throw error;
  return (data ?? []).map((s) => ({
    weekday: s.weekday,
    startTime: s.start_time.slice(0, 5),
    endTime: s.end_time.slice(0, 5),
  }));
}
