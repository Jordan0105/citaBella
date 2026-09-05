---
name: create-report
description: "Use when creating or modifying reports (daily/weekly/monthly/annual): SQL aggregation views with security_invoker, time/day cuts in America/Managua, query layer, streaming report page UI, Excel (SheetJS) / PDF export and verification against known seeds. Triggers: reporte, report, export, Excel, PDF, cierre de caja, KPI, agregación."
---

# Skill: create-report

> Receta para crear un reporte (diario/semanal/mensual/anual, con desgloses y
> exportación). Dueños: **reporting** (definiciones) + **backend** (queries) +
> **frontend** (UI). Lee `agents/reporting.md` (KPIs canónicos) y
> `docs/permissions.md` (solo owner).

## Paso 0 — Definir el reporte (obligatorio antes de codificar)

```md
Nombre: Cierre de caja diario
Período: día natural en America/Managua
Fuente: payments, expenses (completed_at/paid_at/spent_at)
KPIs: ingresos por método, propinas, gastos, neto por moneda
Desgloses: método de pago × moneda
Permisos: owner únicamente (RLS excluye receptionist)
Export: PDF + Excel
```

La definición debe casar con la tabla de KPIs de `agents/reporting.md`.
Si introduces un KPI nuevo, documéntalo ahí en el mismo PR.

## Paso 1 — Agregación en SQL (nunca en JS)

Crear/actualizar una view o function en migración:

```sql
create or replace view v_cash_close
with (security_invoker = true) as
select
  (p.paid_at at time zone 'America/Managua')::date as day,
  p.method,
  p.currency,
  sum(p.amount)                        as income,
  sum(p.tip)                           as tips,
  sum(p.amount * case when p.currency = 'USD'
        then p.exchange_rate else 1 end)::numeric(12,2) as income_nio_ref
from payments p
group by 1, 2, 3;
```

Reglas:

- `security_invoker = true` siempre (hereda RLS).
- Cortes de tiempo: `(col at time zone 'America/Managua')::date`.
- Monedas en columnas/series separadas; conversión combinada SOLO con el
  snapshot `exchange_rate` de la fila, etiquetada como referencia.
- Índices que soporten el group by (ver `database-rules.md`).

## Paso 2 — Query layer

```ts
// src/features/reports/queries/get-daily-close.ts
export async function getDailyClose(dayISO: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_cash_close")
    .select("*")
    .eq("day", dayISO);
  if (error) throw error;
  return dailyCloseSchema.parse(data); // valida la forma
}
```

## Paso 3 — Página con streaming

```tsx
// src/app/(dashboard)/reports/page.tsx — server component
<Suspense fallback={<ReportSkeleton />}>
  <DailyCloseReport day={day} />
</Suspense>
```

## Paso 4 — UI del reporte

- `PageHeader` con rango de fechas + `DateRangePicker` (presets: hoy, semana,
  mes, año).
- `MetricCard`s arriba (ingresos, propinas, gastos, neto por moneda).
- Tabla (TanStack Table en desktop / cards en móvil) por desglose.
- Chart del período (`recharts`, client component) con serie por moneda.
- Botones "Exportar PDF" / "Exportar Excel" (ver paso 5).
- Estados loading/empty ("Sin movimientos en este día")/error.

## Paso 5 — Exportación

- **Excel**: server action `exportReportToExcel(kind, range)` que genera el
  workbook con SheetJS desde la MISMA query de pantalla; devuelve archivo
  (base64) o stream; nombre `citabella-reporte-diario-2026-08-29.xlsx`.
- **PDF**: preferir `window.print()` con hoja de estilos print optimizada
  (rapidez, cero deps) o `@react-pdf/renderer` si el cliente exige formato.
- La exportación respeta los filtros activos y los permisos (action valida rol
  owner).

## Paso 6 — Verificación (con seed conocido)

- [ ] Totales del reporte = cierre manual del seed (exactos, por moneda).
- [ ] Corte de día en Managua: movimiento 23:50 del día anterior NO aparece.
- [ ] Receptionist: la ruta redirige; la action de export devuelve FORBIDDEN.
- [ ] PDF/Excel: mismos números que la pantalla (no re-agregar en JS).
- [ ] Mobile: tabla legible (cards), chart con scroll horizontal si hace falta.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` verde.

## Anti-patrones

- Sumar en JavaScript filas crudas (traer `payments` completos al cliente).
- Convertir monedas históricas con la tasa de HOY (usar snapshot).
- Mezclar propinas dentro de ingresos por servicio.
- Duplicar la lógica de agregación para pantalla y para export.
