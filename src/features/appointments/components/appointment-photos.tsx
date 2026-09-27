"use client";

import { useQueryClient } from "@tanstack/react-query";
import { PhotoGallery } from "./photo-gallery";
import { PhotoUploader } from "./photo-uploader";
import { photoKeys } from "../queries/photos-query";

interface AppointmentPhotosProps {
  appointmentId: string;
  /** Solo la dueña o la trabajadora asignada suben fotos (RLS). */
  canUpload: boolean;
}

/** Bloque de fotos del servicio dentro de la ficha de la cita. */
export function AppointmentPhotos({
  appointmentId,
  canUpload,
}: AppointmentPhotosProps) {
  const queryClient = useQueryClient();

  async function handleUploaded() {
    await queryClient.invalidateQueries({ queryKey: photoKeys.all });
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Fotos del servicio
      </h3>
      <PhotoGallery appointmentId={appointmentId} readOnly={!canUpload} />
      {canUpload && (
        <PhotoUploader
          appointmentId={appointmentId}
          onUploaded={handleUploaded}
        />
      )}
    </section>
  );
}
