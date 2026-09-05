"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { actionFail, actionOk, type ActionResult } from "@/types/action-result";
import { clientIdSchema, type ClientIdInput } from "../schemas/client";

/** Baja de cliente = soft delete (is_active = false). Owner only (RLS). */
export async function deactivateClient(
  input: ClientIdInput,
): Promise<ActionResult<null>> {
  const parsed = clientIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Cliente inválido");
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_active: false })
    .eq("id", parsed.data.id);

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      "No se pudo desactivar el cliente",
    );
  }

  revalidatePath("/clients");
  return actionOk(null);
}
