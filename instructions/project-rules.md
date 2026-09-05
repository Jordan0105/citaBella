# project-rules.md — Reglas globales del proyecto

> Ley del repo. Prevalece sobre preferencias de cualquier agente o humano.

## 1. Identidad del producto

- **CitaBella**: SaaS para salones de belleza en Nicaragua.
- Idioma de UI y contenido: **español (Nicaragua, es-NI)**.
- Idioma de código, identificadores y commits: **inglés** (términos de dominio
  del negocio se traducen: cita→appointment, trabajadora→employee, cliente→client,
  caja→cashbox/finance, comisión→commission).
- Moneda local NIO (`C$`), soporte USD. Zona horaria `America/Managua`.

## 2. Stack obligatorio (no negociable)

Next.js 16 (App Router) · React 19 · TypeScript strict · Supabase (PostgreSQL,
Auth, Storage) · Tailwind CSS v4 · shadcn/ui · Radix UI · Lucide · TanStack
Query · React Hook Form · Zod · TanStack Table · FullCalendar · date-fns ·
`Intl.NumberFormat` · Vercel.

Prohibido introducir librerías sin justificación y aprobación del usuario
(architect registra la decisión como ADR).

## 3. Arquitectura

- **Feature-first**: toda la lógica de dominio vive en `src/features/<dominio>/`
  con `actions/`, `queries/`, `schemas/`, `components/`, `types.ts`.
- **Server Components por defecto**; `"use client"` justificado.
- **Server Actions** como única puerta de escritura de datos.
  `app/api/` solo para webhooks externos y cron.
- **Zod en el servidor** para toda entrada, sin excepciones.
- **RLS es la barrera de seguridad**; el frontend nunca la sustituye.

## 4. Datos

- Esquema canónico en `docs/database-schema.md`; cambiar el schema = migración
  nueva + doc actualizada + tipos regenerados (`pnpm db:types`).
- Nunca editar migraciones aplicadas. Nunca DELETE físico en entidades con
  historial (clientes, servicios, empleados): soft delete (`active=false`).
- `payments` y `commissions` inmutables por trigger.

## 5. Roles

Tres roles: **owner** (dueña, todo), **worker** (sus citas, sus ganancias, sus
clientes), **receptionist** (citas y clientes; jamás ve montos, comisiones ni
reportes financieros). Matriz completa: `docs/permissions.md`.

## 6. Reglas de negocio críticas (resumen; detalle en docs/business-rules.md)

1. No doble cita por trabajadora (conflicto validado en DB).
2. No citas fuera del horario laboral ni en días bloqueados/libres.
3. Comisión: 45% dueña / 55% trabajadora por defecto; configurable por
   trabajadora y por servicio; **snapshot inmutable** al finalizar.
4. Finalizar cita = estado `completed` + fecha/hora real + ingreso + comisiones,
   en una transacción.
5. Toda operación con dinero guarda moneda + `exchange_rate` snapshot.
6. Propinas fuera de la base de comisión.

## 7. UX

- Mobile first (375px primero). Dark mode siempre. WCAG AA siempre.
- Estados loading/empty/error en toda vista.
- Dinero con `lib/money.ts`; fechas con `lib/dates.ts` (date-fns + tz);
  teléfono NIC con `lib/phone.ts`.
- Componentes compartidos en `components/shared/` (lista en `agents/frontend.md`).

## 8. Proceso

- Toda tarea sigue el pipeline de `AGENTS.md` §4 con handoffs §4.
- Definition of Done §6 de `AGENTS.md` obligatoria.
- Commits convencionales (`instructions/git-workflow.md`).
- Documentación viva: si cambias arquitectura, schema, permisos o reglas de
  negocio, actualiza `docs/` en el mismo PR.

## 9. Ambiente

- Variables en `.env.local` (dev) y Vercel (prod). `.env.example` versionado,
  nunca `.env` con valores reales.
- Supabase local para desarrollo (`supabase start`); producción solo con
  migraciones validadas en local.
