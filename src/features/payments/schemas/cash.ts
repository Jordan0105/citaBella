import { z } from "zod";
import { moneySchema } from "@/lib/money";

export const registerIncomeSchema = z.object({
  description: z
    .string()
    .trim()
    .min(3, "Describe el ingreso (mínimo 3 caracteres)")
    .max(200),
  amount: moneySchema.refine((v) => v > 0, "El monto debe ser mayor a 0"),
  currency: z.enum(["NIO", "USD"]),
  method: z.enum(["cash", "transfer", "card"]),
  tip: moneySchema,
});

export type RegisterIncomeInput = z.infer<typeof registerIncomeSchema>;

export const saveExpenseSchema = z.object({
  id: z.string().uuid("Gasto inválido").optional(),
  description: z
    .string()
    .trim()
    .min(3, "Describe el gasto (mínimo 3 caracteres)")
    .max(200),
  amount: moneySchema.refine((v) => v > 0, "El monto debe ser mayor a 0"),
  currency: z.enum(["NIO", "USD"]),
  method: z.enum(["cash", "transfer", "card"]),
  category: z.enum([
    "supplies",
    "rent",
    "utilities",
    "salary_advance",
    "marketing",
    "other",
  ]),
});

export type SaveExpenseInput = z.infer<typeof saveExpenseSchema>;
