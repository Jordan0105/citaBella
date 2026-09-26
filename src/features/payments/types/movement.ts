export interface MovementDTO {
  id: string;
  kind: "income" | "expense";
  description: string;
  amount: number;
  tip: number;
  currency: "NIO" | "USD";
  method: "cash" | "transfer" | "card";
  category: string | null;
  date: string;
}
