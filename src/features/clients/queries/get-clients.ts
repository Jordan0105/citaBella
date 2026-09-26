import { createClient } from "@/lib/supabase/server";
import type { AppointmentDTO } from "@/features/appointments/types";
import {
  APPOINTMENT_SELECT,
  mapAppointmentRow,
} from "@/features/appointments/queries/mapper";
import { CLIENT_SELECT, mapClient } from "./mapper";
import type { ClientDTO } from "../types";

/** Clientes activos. RLS: worker ve solo los suyos; recep/owner todos. */
export async function getClients(): Promise<ClientDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return (data ?? []).map(mapClient);
}

/** Detalle + historial de citas (el historial respeta RLS por rol). */
export async function getClientWithHistory(
  id: string,
): Promise<{ client: ClientDTO; appointments: AppointmentDTO[] } | null> {
  const supabase = await createClient();
  const [{ data: client }, { data: appointments }] = await Promise.all([
    supabase.from("clients").select(CLIENT_SELECT).eq("id", id).single(),
    supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("client_id", id)
      .order("starts_at", { ascending: false }),
  ]);

  if (!client) return null;
  return {
    client: mapClient(client),
    appointments: (appointments ?? []).map(mapAppointmentRow),
  };
}
