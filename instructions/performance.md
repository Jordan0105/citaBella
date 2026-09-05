# performance.md — Rendimiento

> Objetivo: app rápida en móviles de gama media con conexiones inestables
> (realidad de Nicaragua). Presupuestos medibles, no opiniones.

## Presupuestos

| Métrica                           | Presupuesto           |
| --------------------------------- | --------------------- |
| LCP (dashboard, móvil 4G)         | < 2.5s                |
| INP                               | < 200ms               |
| CLS                               | < 0.1                 |
| JS inicial (rutas principales)    | < 200KB gzip          |
| Query de agenda (rango de semana) | < 100ms (con índices) |
| Finalizar cita (transacción)      | < 300ms               |

Medir con Lighthouse CI en Preview deploys; vigilar Vercel Speed Insights.

## Server Components primero

- Default RSC. `"use client"` solo en: formularios, calendario, charts,
  selectores interactivos, toggles.
- Los límites `"use client"` lo más abajo posible en el árbol (componentes
  hoja); páginas y secciones siguen siendo server.
- Nunca importar una librería client-only en un archivo server (FullCalendar,
  recharts → `next/dynamic` con `ssr: false` cuando no aporten al LCP).

## Streaming y Suspense

- Dashboards y reportes: envolver widgets en `<Suspense>` con skeletons
  específicos; el shell responde inmediato, los datos llegan en stream.
- Queries lentas (agregados del mes) no bloquean el HTML del shell:

```tsx
<Suspense fallback={<MetricCardSkeleton />}>
  <MonthRevenueCard /> {/* async server component */}
</Suspense>
```

## Caching (Next.js)

- Server Components: cachear datos estables con `unstable_cache` / fetch cache
  (`revalidate`) — ej. catálogo de servicios y trabajadores (cambia poco).
- Escrituras: `revalidatePath("/calendar")`, `revalidatePath("/dashboard")`,
  y tags por dominio (`revalidateTag("appointments")`) en las server actions.
- Nunca cachear datos por-usuario sin la clave correcta en el cache key.

## TanStack Query (cliente)

- Defaults del app: `staleTime: 30_000`, `refetchOnWindowFocus: false` (agenda
  usa 10s si hay pantalla abierta larga), `retry: 1`.
- Keys jerárquicas por dominio (ver `agents/backend.md` §Queries) para
  invalidaciones quirúrgicas.
- Optimistic UI en mutaciones rápidas (cambiar estado de cita) con rollback en
  error; pagos y finalización NO son optimistas (dinero).

## Imágenes y assets

- `next/image` con tamaños correctos; avatares de trabajadoras desde Supabase
  Storage con transformaciones y cache inmutable (`Cache-Control: 31536000`).
- Fuentes: `next/font` (self-hosted por Next), solo pesos usados, `display: swap`.

## JS y bundles

- `next/dynamic` para FullCalendar, charts y el editor pesado si existiera.
- Import tree-shakeable: `import { format } from "date-fns"` (no default),
  iconos Lucide individuales.
- Revisar `@next/bundle-analyzer` en PRs que toquen dependencias.
- Barrels (`index.ts`) solo en fronteras públicas de feature; evitar re-exports
  gigantes que rompen tree-shaking.

## Base de datos

- Índices según `instructions/database-rules.md`; `EXPLAIN ANALYZE` en cada
  query nueva de reporte.
- Reportes: agregación **en SQL** (views), nunca traer filas crudas a JS para
  sumarlas.
- Paginación/cursor en listados (clientes, historial) — `range()` de Supabase
  o keyset para tablas grandes.
- N+1 prohibido: joins en un solo select (embed de Supabase) o RPC.

## PWA y offline

- Service worker con estrategia: HTML network-first (con fallback offline),
  assets estáticos cache-first, datos con TanStack Query (sin SW cache de API).
- Precache mínimo (shell + offline page); no precachear bundles pesados.

## Reglas de oro

1. Medir antes de optimizar; cada optimización con su número (antes → después).
2. La optimización que complica el código sin mover un presupuesto se rechaza.
3. Mobile real primero: probar en Chrome DevTools throttling "Slow 4G" + 4x CPU.
