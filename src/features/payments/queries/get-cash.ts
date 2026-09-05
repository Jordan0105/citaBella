import { createClient } from "@/lib/supabase/server";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import type { MovementDTO } from "../actions/cash";

export interface CashClose {
  day: string;
  byCurrency: {
    currency: CurrencyCode;
    income: number;
    tips: number;
    expenses: number;
    net: number;
  }[];
}

export interface CashData {
  close: CashClose | null;
  payments: MovementDTO[];
  expenses: MovementDTO[];
}

const MOVEMENT_DAYS = 30;

/** Cierre de caja del día + movimientos recientes (owner only vía RLS). */
export async function getCashData(): Promise<CashData> {
  const supabase = await createClient();
  const since = new Date(Date.now() - MOVEMENT_DAYS * 86_400_000).toISOString();
  const today = new Date().toISOString().slice(0, 10); // suficiente: cierre de HOY se refina abajo

  const [payments, expenses, closeRows] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, description:notes, appointment_id, amount, tip, currency, method, paid_at",
      )
      .gte("paid_at", since)
      .order("paid_at", { ascending: false })
      .limit(50),
    supabase
      .from("expenses")
      .select("id, description, amount, currency, method, category, spent_at")
      .gte("spent_at", since)
      .order("spent_at", { ascending: false })
      .limit(50),
    supabase.from("v_cash_close").select("*"),
  ]);

  if (payments.error) throw payments.error;
  if (expenses.error) throw expenses.error;
  if (closeRows.error) throw closeRows.error;

  // Cierre de HOY en Managua: v_cash_close usa día de Managua; hoy en ISO local
  const todayManagua = new Date(Date.now() - 6 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  void today;

  const byCurrencyMap = new Map<
    CurrencyCode,
    { income: number; tips: number; expenses: number }
  >();
  for (const row of closeRows.data ?? []) {
    if (row.day !== todayManagua) continue;
    const currency = row.currency as CurrencyCode;
    const agg = byCurrencyMap.get(currency) ?? {
      income: 0,
      tips: 0,
      expenses: 0,
    };
    agg.income += Number(row.income);
    agg.tips += Number(row.tips);
    agg.expenses += Number(row.expenses);
    byCurrencyMap.set(currency, agg);
  }

  const close: CashClose | null = byCurrencyMap.size
    ? {
        day: todayManagua,
        byCurrency: [...byCurrencyMap.entries()].map(([currency, agg]) => ({
          currency,
          ...agg,
          net: agg.income - agg.expenses,
        })),
      }
    : null;

  const mapPayment = (row: Record<string, unknown>): MovementDTO => ({
    id: row.id as string,
    kind: "income",
    description: (row.description as string | null) ?? "Cita realizada",
    amount: Number(row.amount),
    tip: Number(row.tip ?? 0),
    currency: row.currency as CurrencyCode,
    method: row.method as MovementDTO["method"],
    category: null,
    date: row.paid_at as string,
  });

  const mapExpense = (row: Record<string, unknown>): MovementDTO => ({
    id: row.id as string,
    kind: "expense",
    description: row.description as string,
    amount: Number(row.amount),
    tip: 0,
    currency: row.currency as CurrencyCode,
    method: row.method as MovementDTO["method"],
    category: (row.category as string | null) ?? null,
    date: row.spent_at as string,
  });

  return {
    close,
    payments: (payments.data ?? []).map(mapPayment),
    expenses: (expenses.data ?? []).map(mapExpense),
  };
}

export function formatMovementAmount(m: MovementDTO): string {
  return formatMoney(m.amount, m.currency);
}
