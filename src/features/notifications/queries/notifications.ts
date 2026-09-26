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
export function notificationsOptions(): ReturnType<
  typeof queryOptions<NotificationDTO[]>
> {
  return queryOptions<NotificationDTO[]>({
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

/** Marca todas como leídas (mutación vía Server Action; el cliente no escribe). */
export { markAllNotificationsRead as markAllRead } from "../actions/mark-read";
