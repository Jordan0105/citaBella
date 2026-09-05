export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SLOT_TAKEN"
  | "OUT_OF_SCHEDULE"
  | "RATE_LIMITED"
  | "DB_ERROR";

export interface ActionError {
  code: ErrorCode;
  /** Mensaje para humanos, en español, accionable. */
  message: string;
  /** Errores por campo para renderizar junto al input. */
  fields?: Record<string, string[]>;
}

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: ActionError };

export function actionOk<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function actionFail(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string[]>,
): { ok: false; error: ActionError } {
  return { ok: false, error: { code, message, fields } };
}

/** Normaliza fieldErrors de Zod (valores opcionales) a Record<string, string[]>. */
export function fieldErrorsOf(
  errors: Record<string, string[] | undefined> | undefined,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors ?? {})) {
    out[key] = value ?? [];
  }
  return out;
}
