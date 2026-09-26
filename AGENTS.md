# AGENTS.md — Sistema de Agentes CitaBella

> CitaBella es una aplicación SaaS para administrar salones de belleza en Nicaragua:
> agenda de citas, clientes, trabajadoras, servicios, caja, comisiones y reportes.
> Moneda local: Córdoba nicaragüense (NIO, `C$`), con soporte para USD.
> Este documento define cómo trabajan los agentes especializados en este repositorio.

---

## 1. Filosofía Agentic First

Este repositorio está diseñado para que agentes de IA (y humanos) trabajen de forma
autónoma, predecible y auditable. Los principios son:

1. **Roles especializados**: cada agente tiene una responsabilidad única y documentos propios.
2. **Contrato de contexto**: antes de escribir código, el agente SIEMPRE lee su rol, las
   instrucciones globales y el skill aplicable. Nunca improvisa convenciones.
3. **Skills como recetas**: tareas repetitivas (crear componente, server action, migración)
   tienen una receta paso a paso en `.opencode/skills/`. Si existe un skill, se sigue.
4. **Instrucciones como ley**: lo definido en `instructions/` es obligatorio y prevalece
   sobre preferencias individuales del agente.
5. **Handoffs explícitos**: cuando un agente termina, entrega un resumen estructurado al
   siguiente (ver §4).
6. **Definition of Done compartida**: ninguna tarea se considera completa sin cumplir la
   checklist de §6.

---

## 2. Agentes disponibles

| Agente         | Archivo                | Responsabilidad principal                                                     | Invocar cuando...                                                          |
| -------------- | ---------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Architect**  | `agents/architect.md`  | Arquitectura, estructura de carpetas, convenciones, feature-first, DDD ligero | Se crea un módulo nuevo, se duda dónde va un archivo, cambia la estructura |
| **Frontend**   | `agents/frontend.md`   | Componentes, formularios, calendario, dashboard, responsive mobile-first      | Toda tarea de UI, pantallas, interacciones cliente                         |
| **Backend**    | `agents/backend.md`    | Server Actions, Supabase, CRUD, validaciones, caché                           | Toda escritura/lectura de datos, lógica de servidor                        |
| **Database**   | `agents/database.md`   | SQL, migraciones, índices, relaciones, RLS policies, triggers, views          | Toda tabla nueva, enum, índice, policy o función SQL                       |
| **UI/UX**      | `agents/uiux.md`       | Sistema de diseño, tokens, paleta, dark mode, accesibilidad visual, PWA       | Diseño de pantallas nuevas, componentes visuales, temas                    |
| **Finance**    | `agents/finance.md`    | Reglas de negocio: comisiones, ingresos, caja, reportes financieros           | Cualquier cálculo de dinero, comisiones, monedas                           |
| **Reporting**  | `agents/reporting.md`  | KPIs, dashboard, exportación PDF/Excel, reportes diarios/semanales/mensuales  | Métricas, agregaciones, gráficas, exportes                                 |
| **QA**         | `agents/qa.md`         | Tests (Vitest, Testing Library, Playwright), checklists, edge cases           | Antes de dar por terminada cualquier feature                               |
| **Security**   | `agents/security.md`   | Auth, roles, permisos, RLS, sanitización, rate limit                          | Revisión previa a merge, tablas con datos sensibles, cambios de auth       |
| **Deployment** | `agents/deployment.md` | Variables de entorno, Supabase, Vercel, CI, producción                        | Setup, deploys, migraciones a producción, rollback                         |

---

## 3. Cómo trabajan los agentes

### 3.1 Ciclo de vida de una tarea

```
Solicitud → Seleccionar agente responsable → Leer contexto obligatorio
         → Planificar (archivos a tocar) → Ejecutar → Auto-verificar
         → Handoff → (siguiente agente o cierre)
```

### 3.2 Contrato de contexto (lectura obligatoria)

Antes de escribir **cualquier** línea de código, el agente debe leer, en este orden:

1. `AGENTS.md` (este archivo).
2. Su propio rol: `agents/<rol>.md`.
3. Instrucciones globales relevantes en `instructions/` (mínimo: `project-rules.md`
   y `coding-style.md`).
4. `docs/business-rules.md` si la tarea toca lógica de negocio (comisiones, agenda, caja).
5. El **skill** correspondiente en `.opencode/skills/` si la tarea es de un tipo
   cubierto (componente, página, action, tabla, formulario, reporte, etc.).
6. `docs/database-schema.md` si toca datos.

### 3.3 Reglas de oro

- **Server Components por defecto**; `"use client"` solo donde hay interactividad.
- **Toda escritura de datos pasa por Server Actions** (nunca API routes para CRUD interno).
- **Toda entrada se valida con Zod en el servidor**, sin excepciones.
- **La seguridad vive en la base de datos (RLS)**: el frontend nunca es la barrera.
- **Dinero siempre con reglas de `agents/finance.md`**: nunca flotantes improvisados,
  nunca recalcular comisiones sin snapshot.
- **Mobile first**: se diseña primero para 375px, luego se escala.
- **Español (es-NI)** en UI y contenido; código, identificadores y commits en inglés
  salvo términos del dominio (cita, trabajadora → `appointment`, `employee`).

---

## 4. Flujo de colaboración estándar (pipeline de feature)

Para una feature típica (ej. "bloquear horarios por trabajadora"):

```
1. architect   → define alcance, archivos y contratos (tipos, firma de actions)
2. database    → migración SQL + RLS + índices + regeneración de tipos
3. backend     → schemas Zod + server actions + queries
4. frontend    → UI con skills create-component / create-form / create-page
5. uiux        → revisión visual, tokens, dark mode, responsive
6. finance     → valida reglas de dinero (si la feature toca pagos/comisiones)
7. reporting   → KPIs/exports (si aplica)
8. qa          → tests unitarios + E2E + checklist de edge cases
9. security    → revisión de RLS, roles y validaciones
10. deployment → variables, migración a producción, verificación post-deploy
```

No todos los pasos aplican siempre; architect decide cuáles se omiten y lo deja
escrito en el plan de la feature.

### Formato de handoff entre agentes

Al terminar, el agente entrega al siguiente:

```md
**From:** backend
**To:** frontend
**Task:** Server actions de citas listas
**Files changed:** src/features/appointments/{actions,queries,schemas}
**Contract:**

- createAppointment(input: CreateAppointmentInput): ActionResult<AppointmentDTO>
- finalizeAppointment(id: string): ActionResult<ReceiptDTO>
  **How to verify:** llamar desde el formulario de cita; conflicto de horario devuelve
  `error.code = "SLOT_TAKEN"`.
  **Risks:** la validación de conflicto es DB-level (function SQL), no depender solo del form.
```

---

## 5. Cuándo usar cada agente (ejemplos)

| Solicitud del usuario                       | Agente principal | Agentes de apoyo                  |
| ------------------------------------------- | ---------------- | --------------------------------- |
| "Crea el CRUD de servicios"                 | backend          | architect, frontend, database, qa |
| "Agrega vista semanal al calendario"        | frontend         | uiux, backend                     |
| "Cambia la comisión de la dueña a 40%"      | finance          | backend, database                 |
| "Reporte mensual en PDF"                    | reporting        | backend, frontend                 |
| "Nueva tabla notifications"                 | database         | security, architect               |
| "La app está lenta en móvil"                | frontend         | architect (performance)           |
| "Configura el deploy a Vercel"              | deployment       | security                          |
| "Revisa que recepcionista no vea ganancias" | security         | backend, qa                       |

---

## 6. Definition of Done (global)

Una tarea está **Done** solo si cumple TODO esto:

- [ ] TypeScript estricto compila sin errores (`pnpm typecheck`).
- [ ] ESLint y Prettier sin errores (`pnpm lint`, `pnpm format`).
- [ ] Sin `any`; sin `@ts-ignore`; sin `eslint-disable` injustificados.
- [ ] Toda entrada de usuario validada con Zod **en el servidor**.
- [ ] RLS policies creadas/actualizadas si hay tablas nuevas o cambios de acceso.
- [ ] Estados de UI cubiertos: loading, empty, error.
- [ ] Responsive verificado: 375px, 768px, 1024px, 1440px.
- [ ] Accesibilidad WCAG AA: labels, focus visible, contraste, teclado.
- [ ] Dark mode verificado (sin colores hardcodeados).
- [ ] Moneda formateada con `lib/money.ts` (NIO `C$ 1,250.00` / USD `$25.00`).
- [ ] Tests escritos y pasando (`pnpm test`); E2E si es flujo crítico.
- [ ] Revisión del agente security si toca auth/roles/RLS.
- [ ] Documentación actualizada si cambia arquitectura, schema o reglas de negocio.

---

## 7. Checklist antes de crear código

1. ¿Ya existe un skill para esta tarea? → úsalo.
2. ¿Dónde vive este archivo? → convención feature-first de `agents/architect.md`.
3. ¿Es Server Component o Client Component? → justificar cada `"use client"`.
4. ¿Qué esquema Zod valida la entrada?
5. ¿Qué policy RLS autoriza esta operación?
6. ¿Qué rol (dueña/trabajadora/recepcionista) puede hacer esto y qué ven los demás?
7. ¿Esto toca dinero? → leer `agents/finance.md` primero.
8. ¿Esto toca el calendario? → revisar conflictos de horario y zonas horarias
   (`America/Managua`).

---

## 8. Checklist antes de hacer merge a `dev`

- [ ] Rama creada desde `dev` con naming `<tipo>/<slug-kebab>`.
- [ ] Commits convencionales (`instructions/git-workflow.md`).
- [ ] `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] Sin secretos, ni `.env`, ni claves en el diff.
- [ ] Migraciones nuevas probadas en local de arriba a abajo (`supabase db reset`).
- [ ] RLS probada con los 3 roles (dueña, trabajadora, recepcionista).
- [ ] QA checklist de la feature completada.
- [ ] Screenshots de mobile + desktop + dark mode en el PR (si es UI).
- [ ] `docs/` actualizada (schema, business-rules, permissions) si aplica.
- [ ] PR contra `dev` (no contra `main`, salvo release).

---

## 9. Estructura de referencia rápida

```
citabella/
├── agents/          # Roles especializados (uno por archivo)
├── instructions/    # Reglas globales obligatorias
├── .opencode/       # Config opencode: skills/, agent/, command/ (se crea con el código)
├── docs/            # Arquitectura, schema, reglas de negocio, roadmap
├── supabase/        # Migraciones, seeds, config (se crea con el código)
└── src/             # Aplicación Next.js (feature-first, ver docs/architecture.md)
```

> **Nota para agentes**: si este documento contradice a `instructions/` o `docs/`,
> asume que este archivo define el "cómo trabajamos" y aquellos el "qué construimos".
> Reporta la contradicción y propón el fix antes de continuar.
