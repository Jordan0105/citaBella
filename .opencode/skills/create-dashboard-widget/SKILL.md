---
name: create-dashboard-widget
description: "Use when creating a dashboard widget: MetricCard/revenue cards, list widgets (upcoming appointments, top services), chart widgets with recharts, KPI definition, Suspense streaming with same-height skeletons, per-role variants (owner/worker/receptionist) and money formatting. Triggers: widget, KPI, MetricCard, dashboard, gráfica, chart."
---

# Skill: create-dashboard-widget

> Receta para un widget del dashboard (MetricCard, lista, gráfica). Dueños:
> **reporting** (KPI) + **frontend** (UI). Lee `agents/reporting.md` §KPIs y
> `instructions/performance.md` §Streaming.

## Paso 0 — Definir el widget

```md
Widget: Total vendido hoy
KPI: sum(payments.amount) de citas completed con completed_at HOY (Managua)
Fuente: v_daily_revenue o query directa
Datos: { nio: number; usd: number; deltaVsYesterday?: number }
Streaming: sí (Suspense + skeleton)
Permisos: owner (financiero) / versión worker = solo sus métricas
```

## Paso 1 — Server Component asíncrono + Suspense

```tsx
// src/features/reports/components/today-revenue-card.tsx
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { getTodayRevenue } from "../queries/get-today-revenue";

export async function TodayRevenueCard() {
  const { nio, usd, deltaVsYesterday } = await getTodayRevenue();
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">Vendido hoy</p>
      <p className="font-display text-3xl tabular-nums">
        {formatMoney(nio, "NIO")}
      </p>
      {usd > 0 && (
        <p className="text-sm text-muted-foreground tabular-nums">
          + {formatMoney(usd, "USD")}
        </p>
      )}
      {deltaVsYesterday != null && (
        <p
          className={
            deltaVsYesterday >= 0
              ? "text-sm text-emerald-600"
              : "text-sm text-destructive"
          }
        >
          {deltaVsYesterday >= 0 ? "▲" : "▼"} {Math.abs(deltaVsYesterday)}% vs
          ayer
        </p>
      )}
    </Card>
  );
}
```

```tsx
// página del dashboard
<Suspense fallback={<MetricCardSkeleton />}>
  <TodayRevenueCard />
</Suspense>
```

## Paso 2 — Queries

- Server: función en `features/<dominio>/queries/` con la agregación en SQL
  (view/RPC). Cachear con tag si el KPI es estable
  (`revalidateTag("dashboard")` en escrituras que lo afectan).
- Cliente (con interacción): `queryOptions` + `initialData` desde el server.
  Refresh automático solo si el widget es "vivo" (agenda de hoy: 10–30s).

## Paso 3 — Widgets de lista (próximas citas, top servicios)

- Server trae ya filtrado/limitado (top 5, próximas 24h) — el cliente no pagina.
- Cada item usa los componentes shared (`AppointmentCard`, `AvatarEmployee`,
  `CommissionBadge`).
- Empty state cálido con CTA ("Programa la primera cita").

## Paso 4 — Widgets de gráfica

- Datos agregados del server (series por día/mes, por moneda).
- Componente `"use client"` con `recharts`; colores de tokens (`var(--bella-500)`)
  para heredar dark mode.
- Accesible: título, resumen textual y datos en tabla accesible.
- `ResponsiveContainer` con altura fija (evita CLS).

## Paso 5 — Variantes por rol

- Owner: KPIs financieros completos.
- Worker: solo sus datos (sus citas de hoy, sus ganancias) — la RLS ya filtra;
  el widget no debe pedir campos financieros que no verá (evita 403 silenciosos).
- Receptionist: agenda y clientes; cero widgets financieros (renderizar
  condicional por rol en la página, que es server).

## Checklist del widget

- [ ] KPI definido en `agents/reporting.md` (o documentado nuevo).
- [ ] Agregación en SQL; corte de tiempo en Managua.
- [ ] Suspense + skeleton de la MISMA altura (sin CLS).
- [ ] Monedas separadas; `formatMoney` de `lib/money.ts`.
- [ ] Loading/empty/error cubiertos; dark mode ok; 375px ok.
- [ ] No expone datos que el rol no puede ver.

## Anti-patrones

- Widget client que fetch-ea todo y filtra en el navegador.
- Skeleton con altura distinta al contenido (salto de layout).
- `Math.round` para dinero (usar `formatMoney`).
- Cálculo de "hoy" con tz del dispositivo.
