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

/** Foto de un servicio realizado, con URL firmada temporal para mostrar. */
export interface AppointmentPhotoDTO {
  id: string;
  appointmentId: string;
  clientId: string;
  employeeId: string | null;
  storagePath: string;
  caption: string | null;
  uploadedBy: string | null;
  createdAt: string;
  /** URL firmada de Supabase Storage (caduca). */
  url: string | null;
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
 * Los valores viven como tokens CSS en globals.css (con variante .dark);
 * aquí solo se referencian para que FullCalendar reciba strings.
 * El color de la trabajadora va en el borde izquierdo del evento.
 */
export const STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; text: string; stripe: string }
> = {
  pending: {
    bg: "var(--status-pending-bg)",
    text: "var(--status-pending-text)",
    stripe: "var(--status-pending-stripe)",
  },
  confirmed: {
    bg: "var(--status-confirmed-bg)",
    text: "var(--status-confirmed-text)",
    stripe: "var(--status-confirmed-stripe)",
  },
  in_progress: {
    bg: "var(--status-in-progress-bg)",
    text: "var(--status-in-progress-text)",
    stripe: "var(--status-in-progress-stripe)",
  },
  completed: {
    bg: "var(--status-completed-bg)",
    text: "var(--status-completed-text)",
    stripe: "var(--status-completed-stripe)",
  },
  cancelled: {
    bg: "var(--status-cancelled-bg)",
    text: "var(--status-cancelled-text)",
    stripe: "var(--status-cancelled-stripe)",
  },
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
