# cursor.rules.md — Reglas para Cursor AI en CitaBella

Estas reglas complementan `AGENTS.md` (sistema de agentes) y `instructions/`
(reglas obligatorias). Ante duda, prevalece `AGENTS.md`.

---

## 1. Rol por defecto

Actúa como **Staff Software Engineer** especializado en el stack del proyecto.
Antes de generar código, identifica qué agente del sistema aplica
(`agents/*.md`) y lee su archivo junto con las instrucciones relevantes.

## 2. Stack inamovible

- Next.js 16 (App Router) + React 19 + TypeScript **strict** (cero `any`).
- Supabase: PostgreSQL + Auth + Storage. Seguridad con **RLS**.
- Tailwind CSS v4 + shadcn/ui + Radix UI + Lucide Icons.
- TanStack Query, React Hook Form, Zod, TanStack Table, FullCalendar, date-fns.
- Escrituras SIEMPRE por **Server Actions** (no API routes para CRUD interno).
- Moneda NIO (`C$ 1,250.00`) y USD (`$25.00`) vía `Intl.NumberFormat` (`lib/money.ts`).

No propongas librerías alternativas sin justificarlo y sin pedir aprobación.

## 3. Estructura feature-first

```
src/
├── app/                      # rutas delgadas (pages, layouts, loading, error)
│   ├── (auth)/login/
│   └── (dashboard)/{dashboard,calendar,clients,employees,services,appointments,finance,reports,settings}/
├── features/<dominio>/       # toda la lógica vive aquí
│   ├── components/           # componentes del dominio
│   ├── actions/              # server actions ("use server")
│   ├── queries/              # queries + hooks TanStack Query
│   ├── schemas/              # Zod schemas
│   └── types.ts
├── components/ui/            # shadcn/ui (no editar a mano lo generado)
├── components/shared/        # MoneyInput, PhoneInput, StatusBadge, MetricCard...
├── lib/                      # supabase clients, money, phone, dates, utils
├── hooks/
└── types/
```

Nunca coloque lógica de dominio dentro de `app/`. Un page importa de `features/`.

## 4. Reglas duras de código

- Server Components por defecto. `"use client"` solo si hay estado, eventos o
  APIs del navegador. FullCalendar y charts son client components.
- Toda entrada se valida con Zod **en el servidor**, dentro de la server action.
- Server actions devuelven `ActionResult<T>` (`{ ok, data } | { ok:false, error }`),
  nunca lanzan errores crudos hacia el cliente.
- Acceso a datos: usar clientes de `lib/supabase/`
  (`server.ts` con cookies, `browser.ts`, `admin.ts` con service role SOLO en server).
- SQL: snake_case plural, PK uuid `gen_random_uuid()`, `created_at`/`updated_at`
  con trigger, FKs explícitas, índices en FKs y columnas de filtrado
  (`appointments(starts_at)`, `(employee_id, starts_at)`), RLS en TODAS las tablas.
- Dinero: `numeric(12,2)`, nunca float. Comisiones con **snapshot inmutable**
  (tablas `commissions` y `payments` sin UPDATE/DELETE por trigger).
- Fechas: timestamptz + zona `America/Managua` (date-fns-tz).
- Teléfono Nicaragua: `+505` + 8 dígitos iniciando en 2/7/8 (ver `lib/phone.ts`).
- Estados de cita: `pending | confirmed | in_progress | completed | cancelled`
  (enum Postgres). Al finalizar: estado `completed`, fecha/hora real, genera
  ingreso + comisiones (45% dueña / 55% trabajadora por defecto, configurable).

## 5. UI/UX

- Mobile first: estilos base para 375px y progresión con `sm/md/lg`.
- Paleta CitaBella: rosa pastel, lavanda, blanco, gris claro. Solo tokens de
  Tailwind v4 / CSS vars (`agents/uiux.md`), nunca hex sueltos en componentes.
- Dark mode obligatorio en todo componente nuevo.
- Estados obligatorios: loading (skeletons), empty, error.
- Accesibilidad WCAG AA: labels, focus visible, navegación por teclado.
- UI en español (es-NI). Identificadores en inglés.

## 6. Skills

Si la tarea corresponde a un skill en `.opencode/skills/`, síguelo literalmente:
`create-component`, `create-page`, `create-server-action`, `create-supabase-table`,
`create-form`, `create-report`, `create-dashboard-widget`, `create-calendar-feature`,
`create-commission-feature`, `create-auth-feature`.

## 7. Calidad y commits

- Antes de terminar: `pnpm lint && pnpm typecheck && pnpm test` en verde.
- Cada cambio cumple la Definition of Done de `AGENTS.md` §6.
- Commits convencionales: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`,
  `test:`, `perf:`, `style:` (ver `instructions/git-workflow.md`).
- Nunca commitear `.env*`, claves ni service role keys.
- Si cambias el schema: nueva migración en `supabase/migrations/` con timestamp,
  nunca editar migraciones ya aplicadas.
