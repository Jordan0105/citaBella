# coding-style.md — Estilo de código obligatorio

> Aplica a todo el código de CitaBella. TypeScript estricto, legible y pequeño.
> El reviewer rechazará PRs que violen estas reglas.

## TypeScript

- **`strict: true`** en `tsconfig.json`. Sin `any` (ni `as any`), sin
  `@ts-ignore` (usa `@ts-expect-error` con comentario de motivo SOLO si no hay
  alternativa), sin tipos implícitos de API pública.
- Tipos de datos del dominio inferidos de Zod: `type X = z.infer<typeof xSchema>`.
- Tipos de filas Supabase desde `types/db.generated.ts` (generado por CLI).
- `interface` para props de componentes y contratos de objetos; `type` para
  unions/inferidos.
- Funciones con retorno explícito cuando son exportadas.
- No usar enums de TS; usar enums de Postgres → tipos union derivados de la DB
  (`type AppointmentStatus = Database["public"]["Enums"]["appointment_status"]`)
  o const objects cuando sea client-side puro.

## Naming

- Variables/funciones: `camelCase`, descriptivas, sin abreviaturas crípticas
  (`appointment` sí, `apt` no).
- Booleanos con prefijo: `isActive`, `hasConflict`, `canEdit`.
- Componentes: `PascalCase`. Hooks: `use` + sustantivo. Tipos: `PascalCase`.
- Constantes de módulo: `SCREAMING_SNAKE_CASE`.
- Archivos: kebab-case (`money-input.tsx`), componentes `.tsx`, utilidades `.ts`.

## Imports

Orden (con `eslint-plugin-simple-import-sort` o equivalente):

1. Librerías de node/framework
2. Librerías de terceros
3. Alias internos (`@/lib`, `@/types`)
4. Features (`@/features/...`)
5. Relativos (`./`)

Prohibidos imports circulares; si ocurren, extraer a un módulo compartido.

## Server / Client Components

- Sin `"use client"` a menos que haya estado, eventos, efectos o APIs de
  navegador. Ante duda, empieza como Server Component y baja el límite al
  componente hoja más pequeño posible.
- Los límites `"use client"` no abstraen datos: el cliente recibe DTOs
  serializables (fechas como ISO string cuando crucen el límite).

## Errores

- Server actions: `ActionResult<T>` — nunca throw hacia el cliente.
- Client components: error boundaries + estados de error explícitos.
- Mensajes de error para humanos, en español, accionables ("Ya existe una cita
  para Ana a esa hora"), nunca códigos crudos de Postgres.

## Funciones y componentes

- Funciones puras para lógica (en `lib/` o junto al dominio); sin efectos
  ocultos.
- Componentes < 200 líneas; extrae subcomponentes, no param blobs.
- Máximo 3 niveles de profundidad JSX; extrae cuando crezca.
- Sin comentarios narrativos ("incrementa i"); comentarios solo para el "por
  qué" no obvio (decisiones de negocio, reglas de finance).

## Estilo de escritura

- Prettier default (`pnpm format`): 80 cols, comillas dobles, trailing comma.
- Preferir composición sobre herencia; early returns sobre else anidados.
- Async/await sobre `.then()`; manejar siempre el error del await.
- No optimizar prematuramente, pero sí: memoizar solo con evidencia de render
  costoso (ver `performance.md`).

## Prohibiciones

- `console.log` en código merged (usar un wrapper propio de logger si se
  necesita; hoy el repo no lo requiere — sonner cubre feedback de UI).
- Colores/strings de UI hardcodeados fuera de tokens.
- Lógica de negocio en componentes o en `app/`.
- `new Date()` local para lógica de negocio → usar helpers de `lib/dates.ts`
  (todo en `America/Managua`).
- Formatear dinero a mano (siempre `lib/money.ts`).
