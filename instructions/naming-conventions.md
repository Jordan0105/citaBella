# naming-conventions.md — Convenciones de nombres

> Idioma: código en **inglés**, UI en **español (es-NI)**. Un mismo concepto,
> un solo nombre en todo el stack (DB ↔ TS ↔ UI).

## Vocabulario canónico (dominio)

| Español (UI)    | Código (en inglés)   | Tabla/campo DB           |
| --------------- | -------------------- | ------------------------ |
| Cita            | appointment          | `appointments`           |
| Cliente         | client               | `clients`                |
| Trabajadora     | employee             | `employees`              |
| Servicio        | service              | `services`               |
| Pago / ingreso  | payment              | `payments`               |
| Gasto           | expense              | `expenses`               |
| Comisión        | commission           | `commissions`            |
| Caja            | cashbox (UI: "Caja") | (reporte, no tabla)      |
| Propina         | tip                  | `payments.tip`           |
| Descuento       | discount             | `appointments.discount`  |
| Horario laboral | availability         | `availability`           |
| Día bloqueado   | blocked date         | `blocked_dates`          |
| Configuración   | setting              | `settings`               |
| Moneda          | currency             | `currencies`             |
| Reporte         | report               | (derivado)               |
| Dueña           | owner                | `user_role.owner`        |
| Recepcionista   | receptionist         | `user_role.receptionist` |

Prohibido mezclar sinónimos: nunca `worker`/`staff`/`stylist` (es `employee`),
nunca `booking`/`turn` (es `appointment`), nunca `customer` (es `client`).

## Archivos y carpetas

- Carpetas y archivos: `kebab-case` → `money-input.tsx`, `create-appointment.ts`.
- Features: plural del dominio → `features/appointments/`, `features/clients/`.
- Estructura interna fija por feature: `actions/`, `queries/`, `schemas/`,
  `components/`, `types.ts`.

## TypeScript

```ts
// Componentes y tipos: PascalCase
function AppointmentCard(props: AppointmentCardProps) {}
interface CreateAppointmentInput {}

// Funciones/variables: camelCase, verbos para acciones
const createAppointment = ...
const formattedTotal = ...

// Booleanos: is/has/can/should
const isFinalized, hasConflict, canEdit

// Constantes: SCREAMING_SNAKE_CASE
const DEFAULT_COMMISSION_WORKER = 55

// Tipos derivados de Zod: <Nombre>Input (entrada) / <Nombre>DTO (salida)
type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
type AppointmentDTO = { ... };

// Server actions: verbo imperativo + entidad
createAppointment, updateAppointmentStatus, finalizeAppointment,
deleteClient, upsertEmployee, setExchangeRate

// Queries: get/use + qué devuelve
getDashboardKPIs, useAppointmentsInRange, useClientHistory

// Hooks custom: use + sustantivo
useManaguaNow, useCurrencyFormatter, useDebounce

// Schemas Zod: camelCase + Schema
createAppointmentSchema, phoneNicSchema, moneySchema

// Enums/unions: singular PascalCase
type AppointmentStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
type CurrencyCode = "NIO" | "USD";
type PaymentMethod = "cash" | "transfer" | "card";
type UserRole = "owner" | "worker" | "receptionist";

// Event handlers: handle + Event
handleSubmit, handleStatusChange

// Tests: igual que el archivo bajo test + .test.ts(x) / .spec.ts (e2e)
money.test.ts, create-appointment.spec.ts
```

## Base de datos

Ver tabla completa de convenciones SQL en `instructions/database-rules.md`
(snake_case plural, PK `id`, FKs `<ref>_id`, índices `idx_*`, triggers `trg_*`).

## Git

- Ramas: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`,
  `refactor/<slug>` — slug corto kebab-case: `feat/appointment-conflict-check`.
- Commits: convencionales (`instructions/git-workflow.md`):
  `feat: add appointment conflict validation`.

## URLs y rutas

- Rutas: minúsculas, kebab-case, en inglés: `/appointments`, `/finance`,
  `/reports/daily`.
- Query params: camelCase en TS (`startDate`, `employeeId`).

## Regla de resolución

Si no existe el término en la tabla canónica: proponer el nombre, documentarlo
aquí en el mismo PR y usarlo consistentemente en DB + TS + UI.
