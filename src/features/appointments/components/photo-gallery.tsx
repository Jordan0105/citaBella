"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatManaguaDate } from "@/lib/dates";
import { deleteAppointmentPhoto } from "../actions/manage-photos";
import {
  appointmentPhotosOptions,
  clientPhotosOptions,
  photoKeys,
  type GalleryPhoto,
} from "../queries/photos-query";

interface PhotoGalleryProps {
  /** Muestra las fotos de una cita concreta... */
  appointmentId?: string;
  /** ...o todas las fotos del historial de un cliente. */
  clientId?: string;
  /** Oculta el botón de borrar (historial de solo lectura). */
  readOnly?: boolean;
}

export function PhotoGallery({
  appointmentId,
  clientId,
  readOnly = false,
}: PhotoGalleryProps) {
  const query = useQuery(
    appointmentId
      ? appointmentPhotosOptions(appointmentId)
      : clientPhotosOptions(clientId ?? ""),
  );
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando fotos...
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        No se pudieron cargar las fotos
      </p>
    );
  }

  const photos = query.data ?? [];

  if (photos.length === 0) {
    return (
      <p className="rounded-xl bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
        <ImageOff className="mx-auto mb-2 h-5 w-5" aria-hidden />
        Sin fotos de servicios
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setSelected(photo)}
              className="group relative aspect-square w-full overflow-hidden rounded-xl bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={
                photo.caption
                  ? `Ver foto: ${photo.caption}`
                  : "Ver foto del servicio"
              }
            >
              {photo.url ? (
                <Image
                  src={photo.url}
                  alt={photo.caption ?? "Foto del servicio"}
                  fill
                  sizes="(max-width: 640px) 33vw, 180px"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <ImageOff className="m-auto h-5 w-5 text-muted-foreground" />
              )}
              {!readOnly && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {photo.appointmentServices
                    ? photo.appointmentServices
                    : formatManaguaDate(new Date(photo.createdAt), "date")}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                Foto del servicio
              </DialogTitle>
              <DialogDescription>
                {selected.appointmentStartsAt
                  ? `${formatManaguaDate(new Date(selected.appointmentStartsAt), "datetime")} · ${selected.appointmentServices}`
                  : formatManaguaDate(new Date(selected.createdAt), "datetime")}
              </DialogDescription>
            </DialogHeader>
            {selected.url && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                <Image
                  src={selected.url}
                  alt={selected.caption ?? "Foto del servicio"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 512px"
                  className="object-contain"
                />
              </div>
            )}
            {selected.caption && (
              <p className="rounded-xl bg-muted px-3 py-2 text-sm whitespace-pre-line">
                {selected.caption}
              </p>
            )}
            {!readOnly && (
              <DeletePhotoButton
                photo={selected}
                onDeleted={() => {
                  setSelected(null);
                  setDeleting(null);
                }}
                deleting={deleting === selected.id}
                setDeleting={setDeleting}
              />
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function DeletePhotoButton({
  photo,
  onDeleted,
  deleting,
  setDeleting,
}: {
  photo: GalleryPhoto;
  onDeleted: () => void;
  deleting: boolean;
  setDeleting: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();

  async function handleDelete() {
    setDeleting(photo.id);
    const result = await deleteAppointmentPhoto({ id: photo.id });
    if (!result.ok) {
      setDeleting(null);
      toast.error(result.error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: photoKeys.all });
    toast.success("Foto eliminada");
    onDeleted();
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      className="w-full rounded-full"
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-4 w-4" aria-hidden />
      )}
      Eliminar foto
    </Button>
  );
}
