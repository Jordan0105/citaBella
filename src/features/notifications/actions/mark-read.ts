"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { actionFail, actionOk, type ActionResult } from "@/types/action-result";

/**
 * Marca todas las notificaciones del usuario como leídas.
 * Única puerta de escritura: el cliente no toca Supabase directamente.
 */
export async function markAllNotificationsRead(): Promise<ActionResult<null>> {
  if (
    !(await rateLimit("markAllNotificationsRead", { max: 10, windowSec: 60 }))
  ) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiadas operaciones. Espera un momento.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionFail("UNAUTHORIZED", "Inicia sesión de nuevo");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return actionFail(
      "DB_ERROR",
      "No se pudieron marcar las notificaciones como leídas",
    );
  }

  revalidatePath("/dashboard");
  return actionOk(null);
}
