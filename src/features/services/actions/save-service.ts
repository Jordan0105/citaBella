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
  serviceIdSchema,
  serviceSchema,
  type ServiceIdInput,
  type ServiceInput,
} from "../schemas/service";
import { SERVICE_SELECT, mapService } from "../queries/mapper";
import type { ServiceDTO } from "../types";

/** Crea o actualiza un servicio del catálogo. Owner only (RLS). */
export async function saveService(
  input: ServiceInput & { id?: string },
): Promise<ActionResult<ServiceDTO>> {
  const { id, ...rest } = input;
  const parsed = serviceSchema.safeParse(rest);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createSupabaseClient();
  const values = {
    name: parsed.data.name,
    description: parsed.data.description,
    price_nio: parsed.data.priceNio,
    price_usd: parsed.data.priceUsd,
    duration_minutes: parsed.data.durationMinutes,
    commission_pct: parsed.data.commissionPct,
  };

  const query = id
    ? supabase.from("services").update(values).eq("id", id)
    : supabase.from("services").insert(values);
  const { data, error } = await query.select(SERVICE_SELECT).single();

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      id ? "No se pudo actualizar el servicio" : "No se pudo crear el servicio",
    );
  }

  revalidatePath("/services");
  revalidatePath("/calendar");
  return actionOk(mapService(data));
}

/** Baja de servicio (is_active = false). Owner only. */
export async function deactivateService(
  input: ServiceIdInput,
): Promise<ActionResult<null>> {
  const parsed = serviceIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Servicio inválido");
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("services")
    .update({ is_active: false })
    .eq("id", parsed.data.id);

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      "No se pudo desactivar el servicio",
    );
  }

  revalidatePath("/services");
  return actionOk(null);
}
