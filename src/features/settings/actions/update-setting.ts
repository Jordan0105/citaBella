"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { actionFail, actionOk, type ActionResult } from "@/types/action-result";
import { isSettingKey, validateSetting } from "../schemas/setting";

/**
 * Actualiza una clave de settings con validación por clave (whitelist).
 * El trigger trg_settings_audit registra old/new en audit_logs.
 */
export async function updateSetting(
  key: string,
  value: unknown,
): Promise<ActionResult<null>> {
  if (!isSettingKey(key)) {
    return actionFail("VALIDATION", "Configuración desconocida");
  }

  const parsed = validateSetting(key, value);
  if (parsed === null) {
    return actionFail(
      "VALIDATION",
      "Valores inválidos para esta configuración",
    );
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: parsed }, { onConflict: "key" });

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      "No se pudo guardar la configuración",
    );
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return actionOk(null);
}
