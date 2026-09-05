# testing.md — Estrategia de pruebas

> Stack: Vitest (unit + integración), Testing Library (componentes), Playwright
> (E2E). El agente QA (`agents/qa.md`) es su dueño; esto es la guía técnica.

## Filosofía

1. **Las reglas de negocio se automatizan primero**: comisiones, conflictos de
   horario, permisos por rol.
2. Pirámide: muchos unit → algunos de componentes → pocos E2E críticos.
3. Todo bug corregido trae su test de regresión.
4. Tests deterministas: tiempo congelado (`vi.setSystemTime`), TZ fija
   (`America/Managua`), seeds conocidos, cero sleeps.

## Estructura

```
src/features/<dominio>/__tests__/*.test.ts      # unit (schemas, lógica)
src/features/<dominio>/__tests__/*.test.tsx     # componentes interactivos
src/lib/__tests__/*.test.ts                     # money, phone, dates
tests/e2e/*.spec.ts                             # Playwright por flujo
tests/e2e/fixtures/*.ts                         # builders de datos
tests/setup.ts                                  # setup Vitest global
```

## Configuración esperada

```ts
// vitest.config.ts (resumen)
environment: "jsdom",
setupFiles: ["tests/setup.ts"],
coverage: { thresholds: { lines: 60, "lib/**": 80, "schemas/**": 80 } }
```

```ts
// playwright.config.ts (resumen)
use: { baseURL: "http://localhost:3000", locale: "es-NI", timezoneId: "America/Managua" },
projects: [{ name: "mobile", use: { viewport: { width: 375, height: 812 } } },
           { name: "desktop", use: { viewport: { width: 1280, height: 720 } } }]
```

## Qué se testea y cómo

### Unit (Vitest)

- `lib/money.ts`: formatos NIO/USD, redondeos, conversión con tasa snapshot.
- `lib/phone.ts`: números NIC válidos/inválidos (8412-3456, 2789-0123, +505,
  7 dígitos → inválido, letras → inválido).
- `lib/dates.ts`: cortes de día/semana/mes en Managua (medianoche, DST no
  aplica pero verificar offset -6), semana inicia lunes.
- Schemas Zod de cada feature: happy path + cada regla (porcentaje 0–100,
  descuento ≤ precio, fechas coherentes).
- Lógica de comisiones pura si se extrae (prioridad service > employee > default).

### Componentes (Testing Library)

- Formularios: errores de validación visibles, submit llama a la action con
  datos parseados, estado loading del botón.
- `StatusBadge`, `CommissionBadge`, `MetricCard`: render por props.
- Selectores (`ServiceSelector`, `EmployeeSelector`): filtrado/selección.
- Accesibilidad: queries por rol/label (`getByRole`, `getByLabelText`), nunca
  por clases CSS.

### E2E (Playwright) — flujos críticos

1. **Login** con roles distintos (owner/worker/receptionist de seed).
2. **Crear cita** happy path + conflicto de horario (mensaje visible).
3. **Finalizar cita**: estado "Realizada", ingreso visible en caja, dashboard
   actualiza.
4. **Permisos**: receptionist no ve /finance (redirect); worker solo ve sus citas.
5. **Caja**: registrar gasto; cierre diario cuadra con seed.
6. **Reporte mensual**: totales NIO/USD contra seed conocido.

## Datos de prueba

- Seed de E2E (`supabase/seed.sql` + fixtures): 3 usuarios (uno por rol),
  3 trabajadoras, 10 servicios del catálogo, 5 clientes, citas de la semana
  actual con estados variados, exchange_rate fija (ej. 36.80 NIO/USD).
- E2E corre contra `supabase start` local + `pnpm dev`.
- Los tests nunca modifican producción; CI usa proyecto Supabase efímero o local.

## Mocks

- Unit: mocks de `lib/supabase/*` (fachada inyectable) o msw para fetch.
- Componentes: server actions mockeadas con `vi.mock("@/features/x/actions")`.
- E2E: sin mocks — RLS y triggers reales son parte de lo que se verifica.

## Comandos

```bash
pnpm test              # Vitest run
pnpm test:watch        # watch
pnpm test:coverage     # con umbrales
pnpm test:e2e          # Playwright
pnpm test:e2e:ui       # modo UI
```

## Criterios de merge (relacionados)

- Suite completa verde en CI.
- Cobertura ≥ 60% global, ≥ 80% en `lib/` y `schemas/`.
- QA checklist de la feature pegada en el PR (`agents/qa.md`).
