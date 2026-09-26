import { createClient } from "@/lib/supabase/server";
import { EMPLOYEE_SELECT, mapEmployee } from "./mapper";
import type { AvailabilitySlotDTO, EmployeeDTO } from "../types";

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
