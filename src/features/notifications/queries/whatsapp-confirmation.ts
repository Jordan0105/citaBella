import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/browser";

export const whatsappConfirmationKeys = {
  confirmation: (appointmentId: string) =>
    ["whatsapp-confirmation", appointmentId] as const,
};

export interface WhatsAppConfirmationResult {
  confirmedAt: string | null;
  cancelledAt: string | null;
}

export function whatsappConfirmationOptions(appointmentId: string) {
  return queryOptions<WhatsAppConfirmationResult>({
    queryKey: whatsappConfirmationKeys.confirmation(appointmentId),
    queryFn: async (): Promise<WhatsAppConfirmationResult> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("created_at, action_taken")
        .eq("appointment_id", appointmentId)
        .eq("direction", "inbound")
        .in("action_taken", ["confirmed", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return { confirmedAt: null, cancelledAt: null };

      return {
        confirmedAt: data.action_taken === "confirmed" ? data.created_at : null,
        cancelledAt: data.action_taken === "cancelled" ? data.created_at : null,
      };
    },
    staleTime: 1000 * 60,
  });
}
