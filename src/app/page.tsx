import { redirect } from "next/navigation";
import { BarChart3, CalendarDays, Sparkles, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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

/** Portada pública: bienvenida para visitantes; con sesión pasa directo al dashboard. */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

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

        <Button asChild size="lg" className="rounded-full px-8">
          <a href="/login">Iniciar sesión</a>
        </Button>

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
      </div>
    </main>
  );
}
