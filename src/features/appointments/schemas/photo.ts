import { z } from "zod";

/** Bucket privado de Supabase Storage para fotos de servicios. */
export const PHOTOS_BUCKET = "appointment-photos";
/** Límite de fotos por cita para no saturar el historial ni el bucket. */
export const MAX_PHOTOS_PER_APPOINTMENT = 12;

/** Límites del bucket `appointment-photos` (validar en cliente y servidor). */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PHOTO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

/**
 * Ruta canónica en storage: <appointment_id>/<uuid>.<ext>.
 * Se valida en el servidor para que nadie registre una foto
 * colgando de otra cita.
 */
export const photoStoragePathSchema = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/,
    "Ruta de foto inválida",
  );

export const savePhotoSchema = z.object({
  appointmentId: z.string().uuid("Cita inválida"),
  storagePath: photoStoragePathSchema,
  caption: z
    .string()
    .trim()
    .max(300, "Máximo 300 caracteres")
    .optional()
    .or(z.literal("")),
});

export type SavePhotoInput = z.infer<typeof savePhotoSchema>;

export const deletePhotoSchema = z.object({
  id: z.string().uuid("Foto inválida"),
});

export type DeletePhotoInput = z.infer<typeof deletePhotoSchema>;

/**
 * Validación del archivo en cliente ANTES de subirlo.
 * No usa Zod porque `File` no es un tipo serializable para `safeParse`.
 */
export function validatePhotoFile(file: File): string | null {
  if (!PHOTO_MIME_TYPES.includes(file.type as never)) {
    return "Solo se permiten fotos JPG, PNG o WebP";
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return "La foto no puede superar 5 MB";
  }
  return null;
}

/** Construye la ruta de storage para una nueva foto de cita. */
export function buildPhotoStoragePath(
  appointmentId: string,
  mimeType: string,
  id: string = crypto.randomUUID(),
): string {
  const ext =
    PHOTO_EXTENSIONS[mimeType as keyof typeof PHOTO_EXTENSIONS] ?? "jpg";
  return `${appointmentId}/${id}.${ext}`;
}
