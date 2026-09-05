@AGENTS.md

# Notas específicas para Claude Code

## Orden de lectura al iniciar una sesión

1. `AGENTS.md` — sistema de agentes, Definition of Done, checklists.
2. `instructions/project-rules.md` y `instructions/coding-style.md` — reglas obligatorias.
3. `docs/business-rules.md` — si la tarea toca comisiones, agenda, caja o monedas.
4. `docs/database-schema.md` — si la tarea toca datos.
5. El skill correspondiente en `.opencode/skills/` si existe para el tipo de tarea.

## Comandos

```bash
pnpm dev            # desarrollo
pnpm lint           # ESLint
pnpm typecheck      # TypeScript strict
pnpm test           # Vitest
pnpm test:e2e       # Playwright
pnpm db:types       # regenerar tipos de Supabase
supabase db reset   # reconstruir DB local (migraciones + seeds)
```

## Reglas críticas (resumen)

- TypeScript strict, cero `any`.
- Server Components por defecto; `"use client"` solo con interactividad.
- Toda escritura por Server Actions validadas con Zod en el servidor.
- Seguridad en RLS (Postgres), nunca solo en el cliente.
- Dinero: seguir `agents/finance.md` (NIO/USD, snapshots de comisión inmutables).
- Zona horaria del negocio: `America/Managua`.
- Mobile first (375px primero), dark mode, WCAG AA.
- UI en español (es-NI); identificadores de código en inglés.
- Commits convencionales (ver `instructions/git-workflow.md`).
