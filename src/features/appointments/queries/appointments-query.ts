import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/browser";
import { APPOINTMENT_SELECT, mapAppointmentRow } from "./mapper";
import type { AppointmentDTO } from "../types";

/** Solo cliente (TanStack Query). El acceso server vive en get-appointments.ts. */
export const appointmentsKeys = {
  all: ["appointments"] as const,
  range: (from: string, to: string) =>
    [...appointmentsKeys.all, "range", { from, to }] as const,
};

export function appointmentsRangeOptions(
  from: string,
  to: string,
): ReturnType<typeof queryOptions<AppointmentDTO[]>> {
  return queryOptions<AppointmentDTO[]>({
    queryKey: appointmentsKeys.range(from, to),
    queryFn: async (): Promise<AppointmentDTO[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at");
      if (error) throw error;
      return (data ?? []).map(mapAppointmentRow);
    },
  });
}
