export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

export interface ReportTotals {
  currency: "NIO" | "USD";
  income: number;
  tips: number;
  expenses: number;
  net: number;
  commissionsWorker: number;
  commissionsOwner: number;
}

export interface ReportData {
  period: ReportPeriod;
  fromDay: string;
  toDay: string;
  totals: ReportTotals[];
  byMethod: {
    method: string;
    currency: string;
    income: number;
    expenses: number;
  }[];
  byEmployee: {
    employeeName: string;
    appointmentsQty: number;
    revenue: number;
    commission: number;
    currency: string;
  }[];
  byService: {
    serviceName: string;
    qty: number;
    revenue: number;
    currency: string;
  }[];
  byClient: {
    clientName: string;
    visits: number;
    spent: number;
    currency: string;
  }[];
  series: {
    day: string;
    currency: string;
    income: number;
    tips: number;
    expenses: number;
  }[];
}

export interface MyReportData {
  period: ReportPeriod;
  fromDay: string;
  toDay: string;
  totalCommission: number;
  currency: string;
  appointmentsQty: number;
  days: { day: string; commission: number }[];
}
