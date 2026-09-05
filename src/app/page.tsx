import { BarChart3, CalendarDays, Sparkles, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: CalendarDays,
    title: "Agenda inteligente",
    description:
      "Calendario por día, semana y mes con colores por estado, horarios por trabajadora y control de conflictos.",
  },
  {
    icon: Wallet,
    title: "Finanzas claras",
    description:
      "Comisiones configurables (45/55 por defecto), caja con ingresos, gastos y propinas. En córdobas y dólares.",
  },
  {
    icon: BarChart3,
    title: "Reportes al día",
    description:
      "Reportes diarios, semanales, mensuales y anuales con desgloses por trabajadora, servicio, método de pago y cliente.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-bella-50 via-background to-lavanda-100 p-6 dark:from-background dark:via-background dark:to-accent">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 shadow-soft">
          <Sparkles
            className="h-8 w-8 text-bella-600 dark:text-bella-400"
            aria-hidden
          />
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            CitaBella
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground">
            Gestión integral para salones de belleza en Nicaragua: agenda,
            clientes, trabajadoras, caja, comisiones y reportes. En córdobas y
            dólares.
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="shadow-soft">
              <CardHeader>
                <feature.icon
                  className="h-6 w-6 text-bella-600 dark:text-bella-400"
                  aria-hidden
                />
                <CardTitle className="text-left text-lg">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-left">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Scaffold listo — Fase 0
          </Badge>
          <p className="text-sm text-muted-foreground">
            Siguiente: Fase 1 — Base de datos y auth. Ver{" "}
            <span className="font-medium text-foreground">docs/roadmap.md</span>
          </p>
        </div>
      </div>
    </main>
  );
}
