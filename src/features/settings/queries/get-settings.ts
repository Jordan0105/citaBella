import { createClient } from "@/lib/supabase/server";
import type { SalonSettings } from "../schemas/setting";

const FALLBACKS: SalonSettings = {
  defaultCommissionOwner: 45,
  defaultCommissionWorker: 55,
  exchangeRate: 36.8,
  defaultCurrency: "NIO",
  businessHours: null,
  salonInfo: null,
};

export async function getSettings(): Promise<SalonSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) throw error;

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));

  const pct = (key: string, fallback: number) => {
    const v = Number((map.get(key) as { pct?: number } | undefined)?.pct);
    return Number.isFinite(v) ? v : fallback;
  };

  const rate = Number(
    (map.get("exchange_rate") as { nio_per_usd?: number } | undefined)
      ?.nio_per_usd,
  );

  const currency = (
    map.get("default_currency") as { code?: "NIO" | "USD" } | undefined
  )?.code;

  return {
    defaultCommissionOwner: pct(
      "default_commission_owner",
      FALLBACKS.defaultCommissionOwner,
    ),
    defaultCommissionWorker: pct(
      "default_commission_worker",
      FALLBACKS.defaultCommissionWorker,
    ),
    exchangeRate:
      Number.isFinite(rate) && rate > 0 ? rate : FALLBACKS.exchangeRate,
    defaultCurrency: currency === "USD" ? "USD" : "NIO",
    businessHours:
      (map.get("business_hours") as SalonSettings["businessHours"]) ?? null,
    salonInfo: (map.get("salon_info") as SalonSettings["salonInfo"]) ?? null,
  };
}
