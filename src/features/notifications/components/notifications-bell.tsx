"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  markAllRead,
  notificationsKeys,
  notificationsOptions,
} from "../queries/notifications";

export function NotificationsBell() {
  const queryClient = useQueryClient();
  const { data } = useQuery(notificationsOptions());
  const unread = (data ?? []).filter((n) => n.readAt == null).length;

  const markRead = useMutation({
    mutationFn: async () => {
      const result = await markAllRead();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
    onError: () => toast.error("No se pudo actualizar"),
  });

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        className="relative rounded-full p-2 outline-ring/50 hover:bg-accent focus-visible:ring-2"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bella-600 px-1 text-[10px] font-bold text-white"
          >
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">Notificaciones</p>
          {unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-full text-xs"
              onClick={() => markRead.mutate()}
              disabled={markRead.isPending}
            >
              <BellOff className="h-3.5 w-3.5" aria-hidden />
              Marcar leídas
            </Button>
          )}
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {(data ?? []).length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin notificaciones
            </li>
          ) : (
            (data ?? []).map((n) => (
              <li
                key={n.id}
                className={cn(
                  "border-b px-4 py-3 text-sm last:border-0",
                  n.readAt == null && "bg-primary/5",
                )}
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
