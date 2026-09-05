export interface ServiceDTO {
  id: string;
  name: string;
  description: string | null;
  priceNio: number;
  priceUsd: number;
  durationMinutes: number;
  commissionPct: number | null;
  isActive: boolean;
}
