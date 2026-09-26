"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/shared/money-input";
import {
  PaymentMethodSelector,
  type PaymentMethod,
} from "@/components/shared/payment-method-selector";
import { formatManaguaDate } from "@/lib/dates";
import { formatMoney, parseMoneyInput, type CurrencyCode } from "@/lib/money";
import { registerDirectIncome, saveExpense } from "../actions/cash";
import type { SaveExpenseInput } from "../schemas/cash";
import type { MovementDTO } from "../types/movement";
import type { CashData } from "../queries/get-cash";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

const CATEGORY_LABELS: Record<string, string> = {
  supplies: "Insumos",
  rent: "Renta",
  utilities: "Servicios",
  salary_advance: "Anticipo",
  marketing: "Publicidad",
  other: "Otros",
};

interface FinanceDashboardProps {
  data: CashData;
}

export function FinanceDashboard({ data }: FinanceDashboardProps) {
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(data.close?.byCurrency ?? []).map((row) => (
          <div key={row.currency} className="space-y-3">
            <Card title={`Hoy · ${row.currency}`}>
              <p className="font-display text-2xl tabular-nums">
                {formatMoney(row.income, row.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Propinas {formatMoney(row.tips, row.currency)}
              </p>
            </Card>
            <Card title={`Neto · ${row.currency}`}>
              <p className="font-display text-2xl tabular-nums">
                {formatMoney(row.net, row.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Gastos {formatMoney(row.expenses, row.currency)}
              </p>
            </Card>
          </div>
        ))}
        {!data.close && (
          <Card title="Hoy">
            <p className="text-sm text-muted-foreground">
              Sin movimientos registrados todavía
            </p>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setIncomeOpen(true)} className="rounded-full">
          <ArrowUpCircle className="h-4 w-4" aria-hidden />
          Registrar ingreso
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setExpenseOpen(true)}
        >
          <ArrowDownCircle className="h-4 w-4" aria-hidden />
          Registrar gasto
        </Button>
      </div>

      <Tabs defaultValue="income">
        <TabsList>
          <TabsTrigger value="income">Ingresos</TabsTrigger>
          <TabsTrigger value="expense">Gastos</TabsTrigger>
        </TabsList>
        <TabsContent value="income">
          <MovementList
            movements={data.payments}
            emptyLabel="Sin ingresos en los últimos 30 días"
          />
        </TabsContent>
        <TabsContent value="expense">
          <MovementList
            movements={data.expenses}
            emptyLabel="Sin gastos en los últimos 30 días"
          />
        </TabsContent>
      </Tabs>

      <IncomeDialog open={incomeOpen} onOpenChange={setIncomeOpen} />
      <ExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function MovementList({
  movements,
  emptyLabel,
}: {
  movements: MovementDTO[];
  emptyLabel: string;
}) {
  if (movements.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {movements.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{m.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatManaguaDate(new Date(m.date), "datetime")} ·{" "}
              {METHOD_LABELS[m.method]}
              {m.category && ` · ${CATEGORY_LABELS[m.category] ?? m.category}`}
              {m.tip > 0 && ` · propina ${formatMoney(m.tip, m.currency)}`}
            </p>
          </div>
          <span className="shrink-0 font-display tabular-nums">
            {formatMoney(m.amount, m.currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

function IncomeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NIO");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tip, setTip] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await registerDirectIncome({
      description,
      amount: parseMoneyInput(amount),
      currency,
      method,
      tip: parseMoneyInput(tip),
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast.success("Ingreso registrado");
    onOpenChange(false);
    setDescription("");
    setAmount("");
    setTip("0");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar ingreso</DialogTitle>
          <DialogDescription>
            Ingreso directo de caja (sin cita)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <ErrorAlert message={error} />}
          <div className="grid gap-2">
            <Label htmlFor="inc-desc">Descripción</Label>
            <Input
              id="inc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Venta de productos"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="inc-amount">Monto</Label>
              <MoneyInput
                id="inc-amount"
                currency={currency}
                value={amount}
                onValueChange={setAmount}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inc-tip">Propina</Label>
              <MoneyInput
                id="inc-tip"
                currency={currency}
                value={tip}
                onValueChange={setTip}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Moneda</span>
            <div
              role="radiogroup"
              aria-label="Moneda"
              className="grid grid-cols-2 gap-2"
            >
              {(["NIO", "USD"] as CurrencyCode[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={currency === c}
                  onClick={() => setCurrency(c)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors ${
                    currency === c
                      ? "border-primary bg-primary/10 text-bella-700 dark:text-bella-300"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {c === "NIO" ? "C$ Córdobas" : "$ Dólares"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Método de pago</span>
            <PaymentMethodSelector value={method} onValueChange={setMethod} />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Registrar ingreso
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NIO");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [category, setCategory] =
    useState<SaveExpenseInput["category"]>("supplies");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await saveExpense({
      description,
      amount: parseMoneyInput(amount),
      currency,
      method,
      category,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    toast.success("Gasto registrado");
    onOpenChange(false);
    setDescription("");
    setAmount("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar gasto</DialogTitle>
          <DialogDescription>Salida de caja del salón</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <ErrorAlert message={error} />}
          <div className="grid gap-2">
            <Label htmlFor="exp-desc">Descripción</Label>
            <Input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Compra de shampoo"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="exp-amount">Monto</Label>
              <MoneyInput
                id="exp-amount"
                currency={currency}
                value={amount}
                onValueChange={setAmount}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exp-category">Categoría</Label>
              <select
                id="exp-category"
                aria-label="Categoría del gasto"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as SaveExpenseInput["category"])
                }
                className="h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Moneda</span>
            <div
              role="radiogroup"
              aria-label="Moneda"
              className="grid grid-cols-2 gap-2"
            >
              {(["NIO", "USD"] as CurrencyCode[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={currency === c}
                  onClick={() => setCurrency(c)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors ${
                    currency === c
                      ? "border-primary bg-primary/10 text-bella-700 dark:text-bella-300"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {c === "NIO" ? "C$ Córdobas" : "$ Dólares"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Método de pago</span>
            <PaymentMethodSelector value={method} onValueChange={setMethod} />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Registrar gasto
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
