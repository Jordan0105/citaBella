import { createClient } from "@/lib/supabase/server";
import { SERVICE_SELECT, mapService } from "./mapper";
import type { ServiceDTO } from "../types";

export async function getServices(): Promise<ServiceDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(mapService);
}
