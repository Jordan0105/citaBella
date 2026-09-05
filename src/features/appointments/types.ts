import type { Database } from "@/types/db.generated";

export type AppointmentStatus =
  Database["public"]["Enums"]["appointment_status"];
export type CurrencyCode = Database["public"]["Enums"]["currency_code"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export interface AppointmentServiceLineDTO {
  id: string;
  serviceId: string;
  serviceName: string;
  price: number;
  discount: number;
  durationMinutes: number;
}

export interface AppointmentDTO {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  employeeId: string;
  employeeName: string;
  employeeColor: string;
  startsAt: string;
  endsAt: string;
  actualEndAt: string | null;
  completedAt: string | null;
  status: AppointmentStatus;
  currency: CurrencyCode;
  price: number;
  discount: number;
  notes: string | null;
  services: AppointmentServiceLineDTO[];
}

export interface AppointmentReceiptDTO {
  appointmentId: string;
  amount: number;
  tip: number;
  currency: CurrencyCode;
  exchangeRate: number;
  method: PaymentMethod;
  completedAt: string;
}

/** Catálogos para formularios de cita (serializable, seguro en cliente). */
export interface AppointmentsMeta {
  clients: { id: string; fullName: string }[];
  employees: { id: string; fullName: string; color: string }[];
  services: {
    id: string;
    name: string;
    priceNio: number;
    priceUsd: number;
    durationMinutes: number;
  }[];
}

/**
 * Colores por estado del calendario (canónicos: agents/uiux.md §Semántica).
 * El color de la trabajadora va en el borde izquierdo del evento.
 */
export const STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; text: string; stripe: string }
> = {
  pending: { bg: "#FBEED3", text: "#6B5217", stripe: "#E4C280" },
  confirmed: { bg: "#E7DEF6", text: "#4A3F6B", stripe: "#B7A6E3" },
  in_progress: { bg: "#DDEBF6", text: "#2F4E66", stripe: "#9CC5E8" },
  completed: { bg: "#DEF0E3", text: "#2E5B3C", stripe: "#9CC9A8" },
  cancelled: { bg: "#ECEAEF", text: "#8A8494", stripe: "#C9C4D2" },
};

export const APPOINTMENT_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};
