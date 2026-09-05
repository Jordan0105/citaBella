"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/shared/phone-input";
import { createClient, updateClient } from "../actions/save-client";
import type { ClientDTO } from "../types";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientDTO;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: ClientFormDialogProps) {
  const isEdit = Boolean(client);
  const [fullName, setFullName] = useState(client?.fullName ?? "");
  const [phone, setPhone] = useState(client?.phone.replace("+505", "") ?? "");
  const [whatsapp, setWhatsapp] = useState(
    client?.whatsapp?.replace("+505", "") ?? "",
  );
  const [email, setEmail] = useState(client?.email ?? "");
  const [birthDate, setBirthDate] = useState(client?.birthDate ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      fullName,
      phone: `+505${phone}`,
      whatsapp: whatsapp ? `+505${whatsapp}` : "",
      email,
      birthDate,
      notes: notes || "",
    };

    const result =
      isEdit && client
        ? await updateClient({ ...payload, id: client.id })
        : await createClient(payload);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    toast.success(isEdit ? "Cliente actualizado" : "Cliente creado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
          <DialogDescription>
            Datos de contacto e información útil para el salón
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="client-name">Nombre</Label>
            <Input
              id="client-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="María José Rivas"
              autoComplete="name"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client-phone">Teléfono</Label>
            <PhoneInput
              id="client-phone"
              value={phone}
              onValueChange={setPhone}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client-whatsapp">
              WhatsApp <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <PhoneInput
              id="client-whatsapp"
              value={whatsapp}
              onValueChange={setWhatsapp}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="opcional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-birth">Cumpleaños</Label>
              <Input
                id="client-birth"
                type="date"
                value={birthDate ?? ""}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client-notes">Notas</Label>
            <Textarea
              id="client-notes"
              rows={2}
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferencias, alergias…"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {isEdit ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
