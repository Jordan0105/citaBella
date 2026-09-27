"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser";
import { saveAppointmentPhoto } from "../actions/manage-photos";
import {
  buildPhotoStoragePath,
  PHOTO_MAX_BYTES,
  PHOTOS_BUCKET,
  validatePhotoFile,
} from "../schemas/photo";

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  progress: "idle" | "uploading" | "saving";
}

interface PhotoUploaderProps {
  appointmentId: string;
  onUploaded: () => void;
}

/**
 * Sube fotos del servicio directo a Supabase Storage (el cliente valida
 * tipo/tamaño) y luego registra la fila con la server action.
 */
export function PhotoUploader({
  appointmentId,
  onUploaded,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted: PendingPhoto[] = [];
    for (const file of Array.from(files)) {
      const error = validatePhotoFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        progress: "idle",
      });
    }
    if (accepted.length > 0) setPending((prev) => [...prev, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePending(id: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function uploadAll() {
    const supabase = createClient();
    let uploaded = 0;

    for (const item of pending) {
      if (item.progress !== "idle") continue;

      const storagePath = buildPhotoStoragePath(
        appointmentId,
        item.file.type,
        item.id,
      );

      setProgress(item.id, "uploading");
      const { error: uploadError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(storagePath, item.file, {
          upsert: false,
          contentType: item.file.type,
        });

      if (uploadError) {
        setProgress(item.id, "idle");
        toast.error(
          uploadError.message.includes("exceeded")
            ? `${item.file.name}: la foto supera ${PHOTO_MAX_BYTES / 1024 / 1024} MB`
            : `No se pudo subir ${item.file.name}`,
        );
        continue;
      }

      setProgress(item.id, "saving");
      const result = await saveAppointmentPhoto({
        appointmentId,
        storagePath,
        caption: item.caption,
      });

      if (!result.ok) {
        // La foto ya está en storage; al menos dejamos el registro limpio.
        await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
        setProgress(item.id, "idle");
        toast.error(result.error.message);
        continue;
      }

      uploaded += 1;
      removePending(item.id);
    }

    if (uploaded > 0) {
      toast.success(
        uploaded === 1 ? "Foto subida" : `${uploaded} fotos subidas`,
      );
      onUploaded();
    }
  }

  function setProgress(id: string, progress: PendingPhoto["progress"]) {
    setPending((prev) =>
      prev.map((p) => (p.id === id ? { ...p, progress } : p)),
    );
  }

  function setCaption(id: string, caption: string) {
    setPending((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p)),
    );
  }

  const isUploading = pending.some((p) => p.progress !== "idle");

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        aria-label="Seleccionar fotos del servicio"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-full"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        <ImagePlus className="h-4 w-4" aria-hidden />
        Subir fotos del servicio
      </Button>

      {pending.length > 0 && (
        <ul className="space-y-3">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-xl border bg-card p-2"
            >
              {/* Preview local de un blob: next/image no optimiza blob: URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={`Vista previa de ${item.file.name}`}
                className="h-20 w-20 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {item.file.name}
                  </p>
                  {item.progress === "idle" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removePending(item.id)}
                      aria-label={`Quitar ${item.file.name}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  ) : (
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  )}
                </div>
                <Textarea
                  value={item.caption}
                  onChange={(e) => setCaption(item.id, e.target.value)}
                  placeholder="Descripción (opcional)"
                  rows={2}
                  maxLength={300}
                  disabled={item.progress !== "idle"}
                  aria-label={`Descripción de ${item.file.name}`}
                  className="text-xs"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <Button
          type="button"
          onClick={uploadAll}
          disabled={isUploading}
          className="w-full rounded-full"
        >
          {isUploading && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          Subir {pending.length === 1 ? "foto" : `${pending.length} fotos`}
        </Button>
      )}
    </div>
  );
}
