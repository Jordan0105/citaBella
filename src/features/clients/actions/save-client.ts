"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  actionFail,
  actionOk,
  fieldErrorsOf,
  type ActionResult,
} from "@/types/action-result";
import { clientSchema, type ClientInput } from "../schemas/client";
import type { ClientDTO } from "../types";

function mapClient(row: Record<string, unknown>): ClientDTO {
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

export async function createClient(
  input: ClientInput,
): Promise<ActionResult<ClientDTO>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return actionFail("UNAUTHORIZED", "Inicia sesión de nuevo");

  const { data, error } = await supabase
    .from("clients")
    .insert({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp,
      email: parsed.data.email,
      birth_date: parsed.data.birthDate,
      notes: parsed.data.notes,
    })
    .select("id, full_name, phone, whatsapp, email, birth_date, notes")
    .single();

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      "No se pudo crear el cliente",
    );
  }

  revalidatePath("/clients");
  return actionOk(mapClient(data));
}

export async function updateClient(
  input: ClientInput & { id: string },
): Promise<ActionResult<ClientDTO>> {
  const parsed = clientSchema.safeParse({
    fullName: input.fullName,
    phone: input.phone,
    whatsapp: input.whatsapp ?? "",
    email: input.email ?? "",
    birthDate: input.birthDate ?? "",
    notes: input.notes ?? "",
  });
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp,
      email: parsed.data.email,
      birth_date: parsed.data.birthDate,
      notes: parsed.data.notes,
    })
    .eq("id", input.id)
    .select("id, full_name, phone, whatsapp, email, birth_date, notes")
    .single();

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      "No se pudo actualizar el cliente",
    );
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${input.id}`);
  return actionOk(mapClient(data));
}
