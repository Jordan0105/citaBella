"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { actionFail, actionOk, type ActionResult } from "@/types/action-result";
import { getAuthContext } from "@/features/auth/queries/get-auth-context";
import {
  deletePhotoSchema,
  MAX_PHOTOS_PER_APPOINTMENT,
  PHOTOS_BUCKET,
  savePhotoSchema,
  type DeletePhotoInput,
  type SavePhotoInput,
} from "../schemas/photo";
import type { AppointmentPhotoDTO } from "../types";

const HISTORY_PATHS = ["/clients", "/calendar", "/appointments"] as const;

function revalidateHistory() {
  for (const path of HISTORY_PATHS) revalidatePath(path);
}

function toDTO(row: {
  id: string;
  appointment_id: string;
  client_id: string;
  employee_id: string | null;
  storage_path: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}): AppointmentPhotoDTO {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    clientId: row.client_id,
    employeeId: row.employee_id,
    storagePath: row.storage_path,
    caption: row.caption,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    url: null,
  };
}

/**
 * Registra en BD una foto ya subida a Storage por el cliente.
 * El upload ocurre en el browser (Supabase Storage) para evitar límites
 * de body en Server Actions; esta action solo valida y crea la fila.
 */
export async function saveAppointmentPhoto(
  input: SavePhotoInput,
): Promise<ActionResult<AppointmentPhotoDTO>> {
  const parsed = savePhotoSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(
      "VALIDATION",
      "Datos de foto inválidos",
      Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [
          k,
          v ?? [],
        ]),
      ),
    );
  }

  if (!(await rateLimit("saveAppointmentPhoto", { max: 30, windowSec: 60 }))) {
    return actionFail("RATE_LIMITED", "Demasiadas fotos. Espera un momento.");
  }

  const auth = await getAuthContext();
  if (!auth) return actionFail("UNAUTHORIZED", "Inicia sesión de nuevo");

  const { appointmentId, storagePath, caption } = parsed.data;

  // La ruta debe pertenecer a la cita declarada (evita registrar fotos
  // colgadas de otra cita o de otra persona).
  if (!storagePath.startsWith(`${appointmentId}/`)) {
    return actionFail("FORBIDDEN", "La foto no pertenece a esta cita");
  }

  const supabase = await createClient();
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select("id, client_id, employee_id, status")
    .eq("id", appointmentId)
    .single();

  if (apptError || !appointment) {
    return actionFail("NOT_FOUND", "Cita no encontrada");
  }

  const isOwner = auth.role === "owner";
  const isAssignedWorker =
    auth.role === "worker" && auth.employeeId === appointment.employee_id;
  if (!isOwner && !isAssignedWorker) {
    return actionFail(
      "FORBIDDEN",
      "Solo la dueña o la trabajadora asignada pueden subir fotos",
    );
  }

  const { count } = await supabase
    .from("appointment_photos")
    .select("id", { count: "exact", head: true })
    .eq("appointment_id", appointmentId);

  if ((count ?? 0) >= MAX_PHOTOS_PER_APPOINTMENT) {
    return actionFail(
      "CONFLICT",
      `Una cita no puede tener más de ${MAX_PHOTOS_PER_APPOINTMENT} fotos`,
    );
  }

  const { data: row, error } = await supabase
    .from("appointment_photos")
    .insert({
      appointment_id: appointmentId,
      client_id: appointment.client_id,
      employee_id: appointment.employee_id,
      storage_path: storagePath,
      caption: caption && caption.trim().length > 0 ? caption.trim() : null,
      uploaded_by: auth.id,
    })
    .select(
      "id, appointment_id, client_id, employee_id, storage_path, caption, uploaded_by, created_at",
    )
    .single();

  if (error || !row) {
    return actionFail("DB_ERROR", "No se pudo guardar la foto");
  }

  revalidateHistory();
  return actionOk(toDTO(row));
}

/** Borra la foto de Storage y su registro en BD. */
export async function deleteAppointmentPhoto(
  input: DeletePhotoInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = deletePhotoSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("VALIDATION", "Foto inválida");
  }

  if (
    !(await rateLimit("deleteAppointmentPhoto", { max: 30, windowSec: 60 }))
  ) {
    return actionFail("RATE_LIMITED", "Demasiadas operaciones. Espera.");
  }

  const auth = await getAuthContext();
  if (!auth) return actionFail("UNAUTHORIZED", "Inicia sesión de nuevo");

  const supabase = await createClient();
  const { data: row, error: findError } = await supabase
    .from("appointment_photos")
    .select(
      "id, appointment_id, storage_path, uploaded_by, appointments!inner(employee_id)",
    )
    .eq("id", parsed.data.id)
    .single();

  if (findError || !row) {
    return actionFail("NOT_FOUND", "Foto no encontrada");
  }

  const assignedEmployeeId = (
    row.appointments as unknown as { employee_id: string } | null
  )?.employee_id;

  const canDelete =
    auth.role === "owner" ||
    row.uploaded_by === auth.id ||
    (auth.role === "worker" && auth.employeeId === assignedEmployeeId);

  if (!canDelete) {
    return actionFail("FORBIDDEN", "No puedes eliminar esta foto");
  }

  const { error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([row.storage_path]);

  if (storageError) {
    return actionFail("DB_ERROR", "No se pudo borrar el archivo de la foto");
  }

  const { error: deleteError } = await supabase
    .from("appointment_photos")
    .delete()
    .eq("id", row.id);

  if (deleteError) {
    return actionFail("DB_ERROR", "No se pudo borrar el registro de la foto");
  }

  revalidateHistory();
  return actionOk({ id: row.id });
}
