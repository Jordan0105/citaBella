# roadmap.md — Fases del proyecto

> Estado y plan de construcción incremental. El architect actualiza esta tabla
> al cerrar cada fase.

## Leyenda de estado

`todo` · `in-progress` · `done`

---

## Fase 0 — Fundaciones (`done`)

- [x] Sistema Agentic First: AGENTS.md, 10 agentes, 9 instrucciones, 10 skills, 7 docs.
- [x] Scaffold Next.js 16 + React 19 + TS strict (create-next-app).
- [x] Tailwind v4 + shadcn/ui + tokens de diseño (paleta CitaBella).
- [x] Supabase local CLI (devDep) + config + `.env.example`.
- [x] ESLint + Prettier + Vitest + Playwright configurados.

## Fase 1 — Base de datos y auth (`done`)

- [x] Migración completa: enums, 15 tablas, índices, triggers, funciones SQL, views.
- [x] RLS con helpers `fn_current_role()` / `fn_current_employee_id()` + tests por rol (`scripts/verify-rls.mjs`: 37 asserts).
- [x] Seeds (catálogo de servicios, settings, usuarios demo: owner/ana/betty/carla/recep · `demo1234`).
- [x] Auth: login, sesión, middleware con gating, rate limit en login.
- [x] Tipos TS generados + lib/{money,dates,phone}.ts.

**Criterios de salida**: `supabase db reset` verde; login con 3 roles;
RLS verificada por rol (37 asserts); E2E de login 8/8 (mobile + desktop).

## Fase 2 — Citas y calendario (`done`)

- [x] CRUD de citas con formulario completo (skill `create-form`).
- [x] FullCalendar día/semana/mes con colores por estado (skill `create-calendar-feature`).
- [x] Conflictos, horarios y bloqueos vía `create_appointment_safe`.
- [x] Flujo de estados + "Cita realizada" visual (check + opacidad; cancelada tachada).
- [x] Clientes: CRUD + historial (`/clients`, `/clients/[id]`).

**Criterios de salida**: E2E de crear y finalizar cita en verde (15/15 mobile +
desktop); conflicto rechazado con mensaje claro ("Ya existe una cita…");
drag & drop de reprogramación con rollback optimista.

## Fase 3 — Finanzas (`done`)

- [x] `complete_appointment` transaccional: ingreso + comisiones con snapshot (Fase 1).
- [x] Trabajadoras: CRUD con comisión %, color, disponibilidad (`/employees`).
- [x] Servicios: CRUD con precios NIO/USD, duración, override (`/services`).
- [x] Caja: gastos, ingresos directos, propinas, métodos de pago (`/finance`, cierre del día).
- [x] Multi-moneda con tasa configurable y snapshot (`/settings`).

**Criterios de salida**: ejemplo de comisión (1000 → 550/450) verificado en
`pnpm db:verify` (37/37); `payments`/`commissions` inmutables verificados;
caja cuadra con seed; E2E de caja y catálogo (19/19).

## Fase 4 — Dashboard y reportes (`done`)

- [x] Dashboard con KPIs (streaming + skeletons) por rol (owner: ingresos hoy/mes, top servicios; worker: sus comisiones; receptionist: solo agenda).
- [x] Reportes diario/semanal/mensual/anual + desgloses (trabajadora, servicio, cliente, método).
- [x] Dashboard financiero con gráficas (recharts, ingresos por día NIO/USD).
- [x] Exportar Excel (SheetJS, misma query que la pantalla) y PDF (print con CSS).
- [x] Views SQL de reportes a grano-día con `security_invoker` (+ `v_daily_commissions`).

**Criterios de salida**: KPIs verificados contra seed (E2E owner/worker);
cortes de período en `America/Managua` con tests unitarios; export Excel
descarga con nombre correcto y respeta permisos (action valida rol owner);
RLS 37/37; suite completa 66 unit + 25 E2E.

## Fase 5 — Pulido de producto (`done`)

- [x] PWA completa: `manifest.webmanifest`, service worker (HTML network-first + offline, assets cache-first, API sin caché), página `/offline`, íconos SVG.
- [x] Accesibilidad: E2E con axe (wcag2a/2aa + 2.1) — 0 violaciones críticas en login, dashboard y offline; dark mode verificado (`prefers-color-scheme`).
- [x] Performance: `scripts/perf-check.mjs` contra build de producción (375px) — LCP 104–188ms (< 2500), CLS 0 (< 0.1), JS inicial ≤ 403KB sin comprimir (< 600KB).
- [x] Notificaciones: campana con badge y "marcar leídas" + cron `/api/cron/reminders` (protegido con `CRON_SECRET`, idempotente por día, `vercel.json` 01:00 UTC = 19:00 Managua).
- [x] WhatsApp: botón "Recordar por WhatsApp" con mensaje prellenado en la cita + acceso rápido en clientes.

**Criterios de salida**: suite completa en verde (66 unit + 43 E2E), RLS 37/37,
axe 0 críticos, presupuestos de perf verificados en build de producción,
`middleware.ts` migrado a `proxy.ts` (sin warnings de Next 16.3).

## Fase 6 — Post-MVP (backlog)

- [x] Notificaciones WhatsApp Business API (recordatorios manuales y automáticos,
      webhook de estados). Confirmaciones por respuesta del cliente: pendiente.
- [ ] Fotos de servicios realizados (Storage) en historial del cliente.
- [ ] Fidelización: cumpleaños, clientes recurrentes, promociones.
- [ ] Multi-sucursal (evaluar necesidad real antes de modelar).
- [ ] Sentry + alertas; métricas de negocio a largo plazo.
- [ ] Pagos parciales / abonos por cita (coordinar con finance: cambios de
      modelo de pagos).
- [ ] Correcciones históricas de comisiones: filas de ajuste que referencian
      la comisión original (owner only, auditadas) — ver business-rules §3.7.
- [ ] Rate limit distribuido (Upstash Redis o tabla `rate_limits` en DB):
      el límite in-memory actual no es efectivo en multi-instancia de Vercel.

---

## Riesgos conocidos

| Riesgo                                        | Mitigación                                   |
| --------------------------------------------- | -------------------------------------------- |
| FullCalendar bundle pesado en móvil           | `next/dynamic` + presupuesto JS vigilado     |
| Zona horaria mal cortada en reportes          | tz fija en helpers + tests de medianoche     |
| Cambio de tasa de cambio afectando históricos | snapshots inmutables (regla de oro)          |
| RLS con huecos para receptionist              | tests por rol bloqueantes en CI              |
| Dependencia de red inestable                  | PWA offline + optimistic UI + feedback claro |

---

## Definición de cada release

- Los releases siguen el pipeline de agentes (`AGENTS.md` §4) y el flujo de
  `docs/deployment.md` §3. Ninguna fase se cierra sin su "Criterios de salida".
