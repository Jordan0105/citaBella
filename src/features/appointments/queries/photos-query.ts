import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/browser";
import type { AppointmentPhotoDTO } from "../types";
import { PHOTOS_BUCKET } from "../schemas/photo";

const SIGNED_URL_TTL_SEC = 3600;

export const photoKeys = {
  all: ["appointment-photos"] as const,
  byAppointment: (appointmentId: string) =>
    [...photoKeys.all, "appointment", appointmentId] as const,
  byClient: (clientId: string) =>
    [...photoKeys.all, "client", clientId] as const,
};

/**
 * Foto con los datos opcionales de la cita asociada, para poder mostrarla
 * igual en la ficha de la cita y en el historial del cliente.
 */
export interface GalleryPhoto extends AppointmentPhotoDTO {
  appointmentStartsAt?: string;
  appointmentServices?: string;
}

interface PhotoRow {
  id: string;
  appointment_id: string;
  client_id: string;
  employee_id: string | null;
  storage_path: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

async function withSignedUrls(
  rows: PhotoRow[],
): Promise<AppointmentPhotoDTO[]> {
  const supabase = createClient();
  const paths = rows.map((r) => r.storage_path);
  const { data: signed } =
    paths.length > 0
      ? await supabase.storage
          .from(PHOTOS_BUCKET)
          .createSignedUrls(paths, SIGNED_URL_TTL_SEC)
      : { data: [] as { signedUrl: string }[] | null };

  const byPath = new Map<string, string>();
  rows.forEach((row, index) => {
    const entry = signed?.[index];
    if (entry?.signedUrl) byPath.set(row.storage_path, entry.signedUrl);
  });

  return rows.map((row) => ({
    id: row.id,
    appointmentId: row.appointment_id,
    clientId: row.client_id,
    employeeId: row.employee_id,
    storagePath: row.storage_path,
    caption: row.caption,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    url: byPath.get(row.storage_path) ?? null,
  }));
}

/** Fotos de una cita concreta (para el panel de la cita). */
export function appointmentPhotosOptions(appointmentId: string) {
  return queryOptions<GalleryPhoto[]>({
    queryKey: photoKeys.byAppointment(appointmentId),
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appointment_photos")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return withSignedUrls((data ?? []) as PhotoRow[]);
    },
    staleTime: 30_000,
  });
}

/**
 * Fotos del historial de un cliente, con el resumen de la cita asociada
 * para poder etiquetarlas por fecha/servicio.
 */
export function clientPhotosOptions(clientId: string) {
  return queryOptions<GalleryPhoto[]>({
    queryKey: photoKeys.byClient(clientId),
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appointment_photos")
        .select(
          "*, appointments!inner(starts_at, services:appointment_services(service:services(name)))",
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as unknown as (PhotoRow & {
        appointments: {
          starts_at: string;
          services: { service: { name: string } | null }[];
        };
      })[];

      const withUrls = await withSignedUrls(rows);
      return withUrls.map((photo, index) => ({
        ...photo,
        appointmentStartsAt: rows[index].appointments.starts_at,
        appointmentServices: rows[index].appointments.services
          .map((line) => line.service?.name ?? "")
          .filter(Boolean)
          .join(" + "),
      }));
    },
    staleTime: 30_000,
  });
}
