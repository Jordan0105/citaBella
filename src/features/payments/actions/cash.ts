"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  actionFail,
  actionOk,
  fieldErrorsOf,
  type ActionResult,
} from "@/types/action-result";
import {
  registerIncomeSchema,
  saveExpenseSchema,
  type RegisterIncomeInput,
  type SaveExpenseInput,
} from "../schemas/cash";
import type { MovementDTO } from "../types/movement";

function mapMovement(
  row: Record<string, unknown>,
  kind: MovementDTO["kind"],
): MovementDTO {
  return {
    id: row.id as string,
    kind,
    description:
      (row.description as string | null) ??
      (row.appointment_id ? "Cita realizada" : "Ingreso"),
    amount: Number(row.amount),
    tip: Number(row.tip ?? 0),
    currency: row.currency as "NIO" | "USD",
    method: row.method as "cash" | "transfer" | "card",
    category: (row.category as string | null) ?? null,
    date: (row.paid_at ?? row.spent_at) as string,
  };
}

/**
 * Tasa NIO/USD del día (snapshot). Solo server; las monedas NIO guardan 1.
 */
async function exchangeRateSnapshot(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  currency: "NIO" | "USD",
): Promise<number | null> {
  if (currency === "NIO") return 1;
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "exchange_rate")
    .single();
  const rate = Number((data?.value as { nio_per_usd?: number })?.nio_per_usd);
  // Sin tasa configurada no se inventan números: null = error explícito.
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

const RATE_LIMIT_MESSAGE = "Demasiadas operaciones. Espera un momento.";

/** Ingreso directo de caja (sin cita). Owner only (RLS). */
export async function registerDirectIncome(
  input: RegisterIncomeInput,
): Promise<ActionResult<MovementDTO>> {
  if (!(await rateLimit("registerDirectIncome", { max: 30, windowSec: 60 }))) {
    return actionFail("RATE_LIMITED", RATE_LIMIT_MESSAGE);
  }

  const parsed = registerIncomeSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createSupabaseClient();
  const exchangeRate = await exchangeRateSnapshot(
    supabase,
    parsed.data.currency,
  );
  if (exchangeRate === null) {
    return actionFail(
      "VALIDATION",
      "Configura la tasa de cambio en Ajustes antes de usar dólares",
    );
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      appointment_id: null,
      amount: parsed.data.amount,
      tip: parsed.data.tip,
      currency: parsed.data.currency,
      exchange_rate: exchangeRate,
      method: parsed.data.method,
      notes: parsed.data.description,
    })
    .select("id, amount, tip, currency, method, paid_at, notes, appointment_id")
    .single();

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      "No se pudo registrar el ingreso",
    );
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return actionOk(mapMovement(data, "income"));
}

/** Registra o actualiza un gasto de caja. Owner only (RLS). */
export async function saveExpense(
  input: SaveExpenseInput,
): Promise<ActionResult<MovementDTO>> {
  if (!(await rateLimit("saveExpense", { max: 30, windowSec: 60 }))) {
    return actionFail("RATE_LIMITED", RATE_LIMIT_MESSAGE);
  }

  const parsed = saveExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  const supabase = await createSupabaseClient();
  const exchangeRate = await exchangeRateSnapshot(
    supabase,
    parsed.data.currency,
  );
  if (exchangeRate === null) {
    return actionFail(
      "VALIDATION",
      "Configura la tasa de cambio en Ajustes antes de usar dólares",
    );
  }

  const values = {
    description: parsed.data.description,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    exchange_rate: exchangeRate,
    method: parsed.data.method,
    category: parsed.data.category,
  };

  const query = parsed.data.id
    ? supabase.from("expenses").update(values).eq("id", parsed.data.id)
    : supabase.from("expenses").insert(values);

  const { data, error } = await query
    .select("id, description, amount, currency, method, category, spent_at")
    .single();

  if (error) {
    return actionFail(
      error.code === "42501" ? "FORBIDDEN" : "DB_ERROR",
      "No se pudo guardar el gasto",
    );
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return actionOk(mapMovement(data, "expense"));
}
