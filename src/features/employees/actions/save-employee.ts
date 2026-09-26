"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  actionFail,
  actionOk,
  fieldErrorsOf,
  type ActionResult,
} from "@/types/action-result";
import {
  availabilitySchema,
  employeeIdSchema,
  employeeSchema,
  type AvailabilityInput,
  type EmployeeIdInput,
  type EmployeeInput,
} from "../schemas/employee";
import { EMPLOYEE_SELECT, mapEmployee } from "../queries/mapper";
import type { EmployeeDTO } from "../types";

/** Crea o actualiza una trabajadora. Owner only (RLS). */
export async function saveEmployee(
  input: EmployeeInput & { id?: string },
): Promise<ActionResult<EmployeeDTO>> {
  const { id, ...rest } = input;
  const parsed = employeeSchema.safeParse(rest);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createSupabaseClient();
  const values = {
    full_name: parsed.data.fullName,
    specialty: parsed.data.specialty,
    color: parsed.data.color,
    commission_pct: parsed.data.commissionPct,
    phone: parsed.data.phone,
    is_active: parsed.data.isActive,
  };

  const query = id
    ? supabase.from("employees").update(values).eq("id", id)
    : supabase.from("employees").insert(values);
  const { data, error } = await query.select(EMPLOYEE_SELECT).single();

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      id
        ? "No se pudo actualizar la trabajadora"
        : "No se pudo crear la trabajadora",
    );
  }

  revalidatePath("/employees");
  revalidatePath("/calendar");
  return actionOk(mapEmployee(data));
}

/** Baja lógica de trabajadora (is_active = false). Owner only. */
export async function deactivateEmployee(
  input: EmployeeIdInput,
): Promise<ActionResult<null>> {
  const parsed = employeeIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Trabajadora inválida");
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("employees")
    .update({ is_active: false })
    .eq("id", parsed.data.id);

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      "No se pudo desactivar la trabajadora",
    );
  }

  revalidatePath("/employees");
  revalidatePath("/calendar");
  return actionOk(null);
}

/** Reemplaza el horario semanal completo de una trabajadora. Owner only. */
export async function setAvailability(
  input: AvailabilityInput,
): Promise<ActionResult<null>> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Horario inválido",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createSupabaseClient();
  const { error: deleteError } = await supabase
    .from("availability")
    .delete()
    .eq("employee_id", parsed.data.employeeId);
  if (deleteError) {
    return actionFail("DB_ERROR", "No se pudo guardar el horario");
  }

  if (parsed.data.slots.length === 0) {
    revalidatePath("/employees");
    return actionOk(null);
  }

  const { error: insertError } = await supabase.from("availability").insert(
    parsed.data.slots.map((slot) => ({
      employee_id: parsed.data.employeeId,
      weekday: slot.weekday,
      start_time: slot.startTime,
      end_time: slot.endTime,
    })),
  );

  if (insertError) {
    return actionFail("DB_ERROR", "No se pudo guardar el horario");
  }

  revalidatePath("/employees");
  return actionOk(null);
}
