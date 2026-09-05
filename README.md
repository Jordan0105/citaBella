# CitaBella

**Gestión integral para salones de belleza en Nicaragua.**

CitaBella es una aplicación web SaaS moderna para administrar salones de belleza:
agenda de citas, clientes, trabajadoras, servicios, caja, comisiones por porcentaje
y reportes financieros. Optimizada para móvil y escritorio, con soporte nativo para
Córdobas (NIO, `C$`) y Dólares (USD).

---

## Características

- **Agenda inteligente**: calendario FullCalendar (día/semana/mes) con colores por
  estado de cita, detección de conflictos de horario y horarios por trabajadora.
- **Clientes**: CRUD completo con teléfono nicaragüense, WhatsApp, cumpleaños,
  notas e historial de citas.
- **Trabajadoras**: CRUD con especialidad, color identificativo, comisión % y estado.
- **Servicios**: catálogo con precio en NIO y USD, duración y comisión personalizada
  opcional (corte, tinte, mechas, manicure, pedicure, cejas, pestañas, keratina, etc.).
- **Citas**: formulario completo (cliente, trabajadora, servicio, fecha, horas, moneda,
  precio, descuento, estado) con verificación de conflicto horario y bloqueo de
  doble cita. Flujo de estados: `Pendiente → Confirmada → En proceso → Finalizada /
Cancelada`. Al finalizar se genera ingreso + comisiones automáticamente.
- **Finanzas**: comisiones configurables (por defecto dueña 45% / trabajadora 55%,
  personalizables por trabajadora y por servicio), caja con ingresos, gastos y
  propinas, métodos de pago (efectivo, transferencia, tarjeta) y multi-moneda.
- **Reportes**: diario, semanal, mensual y anual; por trabajadora, servicio, método
  de pago, moneda y cliente. Dashboard con KPIs y gráficas. Exportar PDF/Excel.
- **Roles**: dueña (todo), trabajadora (sus citas, ganancias y clientes),
  recepcionista (citas y clientes, sin finanzas).
- **UX**: diseño femenino elegante (rosa pastel, lavanda, blanco, gris claro),
  dark mode, PWA ready, accesible (WCAG AA).

---

## Stack

| Capa           | Tecnología                                           |
| -------------- | ---------------------------------------------------- |
| Framework      | Next.js 16 (App Router), React 19, TypeScript strict |
| Backend / DB   | Supabase (PostgreSQL, Auth, Storage, RLS)            |
| UI             | Tailwind CSS v4, shadcn/ui, Radix UI, Lucide Icons   |
| Estado / datos | TanStack Query, React Hook Form, Zod                 |
| Tablas         | TanStack Table                                       |
| Calendario     | FullCalendar                                         |
| Fechas         | date-fns (tz `America/Managua`)                      |
| Monedas        | `Intl.NumberFormat`                                  |
| Escrituras     | Server Actions + Zod                                 |
| Deploy         | Vercel                                               |

---

## Estructura del repositorio

```
citabella/
├── AGENTS.md            # Cómo trabajan los agentes (empezar aquí)
├── CLAUDE.md            # Punto de entrada para Claude Code
├── cursor.rules.md      # Reglas para Cursor
├── agents/              # 10 agentes especializados
├── instructions/        # Reglas globales obligatorias
├── .opencode/           # Config opencode: skills/, agent/, command/
├── docs/                # Arquitectura, schema, negocio, permisos, deploy, roadmap
├── supabase/            # Migraciones y seeds (se crea con el código)
└── src/                 # App Next.js feature-first (se crea con el código)
```

---

## Requisitos previos

- Node.js 20+ y pnpm 9+
- Cuenta de Supabase (proyecto con PostgreSQL 15+)
- Cuenta de Vercel (para deploy)
- Supabase CLI (`npm i -g supabase`)

## Variables de entorno

Crea `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # solo servidor, nunca al cliente
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar Supabase local (o vincular proyecto remoto)
supabase start
supabase db reset        # aplica migraciones + seeds

# 3. Entorno
cp .env.example .env.local

# 4. Desarrollo
pnpm dev                 # http://localhost:3000
```

### Scripts

| Comando          | Descripción                                        |
| ---------------- | -------------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo                             |
| `pnpm build`     | Build de producción                                |
| `pnpm start`     | Servir build de producción                         |
| `pnpm lint`      | ESLint                                             |
| `pnpm format`    | Prettier (write)                                   |
| `pnpm typecheck` | TypeScript strict                                  |
| `pnpm test`      | Vitest (unit + componentes)                        |
| `pnpm test:e2e`  | Playwright                                         |
| `pnpm db:types`  | Regenerar tipos de Supabase (`supabase gen types`) |

---

## Documentación

| Documento                                            | Contenido                                             |
| ---------------------------------------------------- | ----------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                             | Sistema de agentes, flujos y Definition of Done       |
| [`docs/architecture.md`](docs/architecture.md)       | Arquitectura y estructura de carpetas                 |
| [`docs/database-schema.md`](docs/database-schema.md) | Modelo de datos completo (SQL, RLS, triggers, views)  |
| [`docs/business-rules.md`](docs/business-rules.md)   | Reglas de negocio (agenda, comisiones, caja, monedas) |
| [`docs/permissions.md`](docs/permissions.md)         | Matriz de permisos por rol                            |
| [`docs/api.md`](docs/api.md)                         | Contrato de Server Actions por dominio                |
| [`docs/deployment.md`](docs/deployment.md)           | Deploy a Supabase + Vercel                            |
| [`docs/roadmap.md`](docs/roadmap.md)                 | Fases y estado del proyecto                           |

---

## Deploy

La app se despliega en Vercel con Supabase como backend. Guía completa y checklist
en [`docs/deployment.md`](docs/deployment.md).

---

## Filosofía del repo

Este proyecto se desarrolla con metodología **Agentic First**: agentes de IA
especializados (arquitecto, backend, frontend, base de datos, finanzas, QA,
seguridad...) colaboran siguiendo skills y instrucciones versionadas. Si vas a
trabajar en el código (humano o IA), empieza por [`AGENTS.md`](AGENTS.md).

---

## Licencia

Privado — Todos los derechos reservados. © 2026 CitaBella
