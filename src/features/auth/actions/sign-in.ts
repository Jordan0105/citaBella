"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  actionFail,
  fieldErrorsOf,
  type ActionResult,
} from "@/types/action-result";
import { signInSchema, type SignInInput } from "../schemas/sign-in";

export async function signIn(input: SignInInput): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos inválidos",
      fieldErrorsOf(parsed.error.flatten().fieldErrors),
    );
  }

  if (
    !(await rateLimit(`signIn:${parsed.data.email}`, { max: 5, windowSec: 60 }))
  ) {
    return actionFail(
      "RATE_LIMITED",
      "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Mensaje genérico: no revelar si el correo existe (agents/security.md)
    return actionFail("UNAUTHORIZED", "Credenciales incorrectas");
  }

  redirect("/dashboard");
}
