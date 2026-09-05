import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/browser";

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export const notificationsKeys = {
  all: ["notifications"] as const,
};

function mapNotification(row: Record<string, unknown>): NotificationDTO {
  return {
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    body: row.body as string,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

/** Campana: notificaciones del usuario (RLS). Refetch cada 60 s. */
export function notificationsOptions() {
  return queryOptions({
    queryKey: notificationsKeys.all,
    queryFn: async (): Promise<NotificationDTO[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map(mapNotification);
    },
    refetchInterval: 60_000,
  });
}

/** Marca todas las notificaciones del usuario como leídas. */
export async function markAllRead(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}
