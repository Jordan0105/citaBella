# architecture.md — Arquitectura de CitaBella

> Dueño: **architect**. Este documento es la referencia canónica de estructura y
> decisiones. Cualquier cambio estructural se refleja aquí en el mismo PR.

---

## 1. Visión general

```
┌──────────────────────────────────────────────────────────┐
│                     Cliente (browser)                     │
│   React 19 · Server Components · Client Components        │
│   Tailwind v4 + shadcn/ui · FullCalendar · TanStack Query │
└───────────────┬──────────────────────────┬───────────────┘
                │ RSC payload / HTML        │ hooks TanStack Query
┌───────────────▼──────────────────────────▼───────────────┐
│                    Next.js 16 (Vercel)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ app/ (rutas)│  │ features/*   │  │ middleware.ts     │  │
│  │ composición │  │ actions/     │  │ sesión + gating   │  │
│  │ metadata    │  │ queries/     │  └──────────────────┘  │
│  └─────────────┘  │ schemas/ Zod │                         │
│                   └──────┬───────┘                         │
└──────────────────────────┼─────────────────────────────────┘
                           │ supabase-js (RLS activo) / RPC
┌──────────────────────────▼─────────────────────────────────┐
│                       Supabase                              │
│  PostgreSQL 15 (enums, triggers, functions, views, RLS)     │
│  Auth (email/contraseña) · Storage (avatars, fotos)         │
└─────────────────────────────────────────────────────────────┘
```

**Flujo de datos:**

- Lecturas: Server Component → `queries/` → Supabase (RLS) → HTML/RSC stream.
- Escrituras: UI → Server Action (`actions/`) → Zod → auth/rol → RPC SQL
  transaccional → `revalidatePath` → UI actualizada.
- El navegador nunca habla directo con tablas de negocio salvo vía
  `queries/` del cliente (RLS protege igualmente).

---

## 2. Estructura de carpetas (canónica)

```
src/
├── app/
│   ├── layout.tsx                  # html, fonts, providers
│   ├── globals.css                 # tokens Tailwind v4 (@theme)
│   ├── manifest.webmanifest        # PWA
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # shell: sidebar desktop / bottom-nav móvil
│   │   ├── dashboard/page.tsx      # KPIs, próximas citas
│   │   ├── calendar/page.tsx       # FullCalendar día/semana/mes
│   │   ├── clients/page.tsx        # + [id]/page.tsx (historial)
│   │   ├── employees/page.tsx
│   │   ├── services/page.tsx
│   │   ├── appointments/page.tsx   # lista + finalizar
│   │   ├── finance/page.tsx        # caja (owner only)
│   │   ├── reports/page.tsx        # reportes + exports (owner only)
│   │   └── settings/page.tsx       # settings (owner only)
│   └── api/                        # SOLO webhooks/cron (no CRUD)
├── features/
│   ├── auth/        ├── appointments/  ├── clients/
│   ├── employees/   ├── services/      ├── payments/
│   ├── commissions/ ├── expenses/      ├── reports/
│   └── settings/
│       └── (cada una): actions/ · queries/ · schemas/ · components/ · types.ts
├── components/
│   ├── ui/          # primitivos shadcn/ui
│   └── shared/      # MoneyInput, PhoneInput, StatusBadge, MetricCard, ...
├── lib/
│   ├── supabase/    # server.ts · browser.ts · admin.ts · middleware.ts
│   ├── money.ts · phone.ts · dates.ts · rate-limit.ts · logger.ts · utils.ts
├── hooks/
├── types/           # db.generated.ts · action-result.ts · index.ts
└── middleware.ts
supabase/
├── migrations/      # SQL versionado por timestamp
├── seed.sql
└── config.toml
```

**Reglas de dependencia** (acíclicas):
`app/ → features/ → lib/ → types/`; `features/A` nunca importa `features/B`
(usar `components/shared` o contrato; si no, escala al architect).

---

## 3. Decisiones de arquitectura (ADR)

| #   | Contexto             | Decisión                                                                                | Consecuencia                                                           |
| --- | -------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 001 | Escrituras de datos  | Server Actions como única puerta; API routes solo webhooks/cron                         | Menos superficie, validación central; no hay REST interno que mantener |
| 002 | Seguridad            | RLS en Postgres con helpers `fn_current_role()`; UI nunca autoriza                      | Seguridad real por rol; cada policy se testea con 3 roles              |
| 003 | Dinero               | `numeric(12,2)` + snapshots inmutables (`payments`, `commissions`) en transacciones SQL | Histórico auditable; cambios de reglas no tocan pasado                 |
| 004 | Conflictos de agenda | Validación en function SQL (`create_appointment_safe`)                                  | Sin race conditions entre pestañas/usuarios                            |
| 005 | Multi-moneda         | Moneda por operación + `exchange_rate` snapshot; sin conversión histórica               | Reportes combinados exactos; presentación vía `lib/money.ts`           |
| 006 | Tiempo               | `timestamptz` + tz de negocio `America/Managua` en cortes y UI                          | Fines de día/semana correctos sin importar el dispositivo              |
| 007 | Componentes          | RSC default; `use client` solo en hojas interactivas                                    | JS mínimo en móvil de gama media                                       |
| 008 | Agregaciones         | En SQL (views) para reportes/dashboard; nunca sumar en JS                               | Escalable y una sola definición de KPI                                 |
| 009 | Deletes              | Soft delete para entidades con historial; pagos/comisiones inmutables                   | Integridad referencial y auditoría intactas                            |

---

## 4. Módulos (features) y sus responsabilidades

| Feature        | Contiene                                     | Notas                           |
| -------------- | -------------------------------------------- | ------------------------------- |
| `auth`         | login, sesión, usuarios, roles               | skill `create-auth-feature`     |
| `appointments` | CRUD, estados, calendario, conflictos        | skill `create-calendar-feature` |
| `clients`      | CRUD, historial de citas                     | soft delete                     |
| `employees`    | CRUD, comisión %, color, disponibilidad      | override de comisión            |
| `services`     | CRUD, precios NIO/USD, duración, override    | catálogo seed                   |
| `payments`     | ingresos por cita y directos, propinas       | inmutable                       |
| `commissions`  | snapshots de comisiones, ajustes             | inmutable                       |
| `expenses`     | gastos de caja                               | owner + receptionist select     |
| `reports`      | KPIs, reportes, exports                      | skill `create-report`           |
| `settings`     | defaults %, tasa, horario salón, datos salón | owner only                      |

---

## 5. Patrones transversales

- **ActionResult<T>** para toda server action (`types/action-result.ts`).
- **Query keys jerárquicos** por dominio para invalidación quirúrgica.
- **Skeletons idénticos** al contenido (sin CLS) en `loading.tsx` y Suspense.
- **Helpers obligatorios**: `lib/money.ts` (dinero), `lib/dates.ts` (tiempo),
  `lib/phone.ts` (teléfonos NIC), `lib/rate-limit.ts`.
- **PWA**: manifest + SW network-first con página offline.

## 6. Rutas y permisos (resumen)

| Ruta                                | owner    | worker           | receptionist |
| ----------------------------------- | -------- | ---------------- | ------------ |
| `/dashboard`                        | completo | versión personal | sin finanzas |
| `/calendar`                         | ✓        | solo su agenda   | ✓            |
| `/clients`, `/appointments`         | ✓        | suyos            | ✓            |
| `/employees`, `/services`           | ✓        | —                | —            |
| `/finance`, `/reports`, `/settings` | ✓        | —                | —            |

Detalle completo: `docs/permissions.md`.

## 7. Futuro reservado (extensiones sin romper)

- Notificaciones (WhatsApp/email): `notifications` ya modelada; adaptador
  `lib/notifications/`.
- Multi-sucursal: `settings` y tablas tendrían `salon_id`; decisión pendiente
  (no modelar hasta necesidad real).
- Recordatorios automáticos: cron en `app/api/cron/` con `CRON_SECRET`.
