# git-workflow.md — Flujo de Git

> Ramas, commits convencionales y revisión. Sin excepciones.

## Ramas

- `main`: **producción protegida**. Solo recibe merges desde `dev` mediante
  PR de release. Nunca push directo ni feature branches directos.
- `dev`: **integración continua**. Todas las ramas de trabajo nacen de `dev`
  y se mergean de vuelta a `dev` vía PR. `dev` debe estar siempre verde.
- Ramas de trabajo: `<tipo>/<slug-kebab>`, creadas **siempre desde `dev`**:

```
feat/whatsapp-business-api
fix/commission-rounding-half-up
chore/setup-playwright
docs/permissions-matrix
refactor/extract-money-lib
```

### Naming estándar

| Tipo       | Uso                                       | Ejemplo                               |
| ---------- | ----------------------------------------- | ------------------------------------- |
| `feat`     | nueva funcionalidad                       | `feat/whatsapp-reminders`             |
| `fix`      | corrección de bug                         | `fix/dashboard-loading-state`         |
| `docs`     | documentación / ADR / agents              | `docs/branching-strategy`             |
| `refactor` | cambio interno sin cambiar comportamiento | `refactor/extract-appointment-mapper` |
| `test`     | tests (unit/e2e)                          | `test/rls-notifications`              |
| `chore`    | mantenimiento / tooling                   | `chore/update-eslint-config`          |
| `build`    | dependencias / build                      | `build/upgrade-nextjs`                |
| `ci`       | CI/CD / Vercel / GitHub Actions           | `ci/preview-deploy-dev`               |

- Una rama = una feature/concern. Vida corta (< 3 días ideal).
- Antes de mergear a `dev`: `git rebase dev` (o merge de `dev` en la rama) y
  asegurar que `pnpm lint && pnpm typecheck && pnpm test` esté en verde.

## Flujo de integración

```
main  ←──── release PR ←──── dev
                 ↑
                 │
dev ←──── PR ←── feat/whatsapp-business-api
        (squash)
```

1. `git checkout dev && git pull origin dev`
2. `git checkout -b feat/<slug>`
3. Commits convencionales.
4. PR contra `dev` con checklist de QA.
5. Merge squash a `dev`.
6. Cuando `dev` esté estable: PR `dev → main` (release), merge sin squash
   o con merge commit, según se acuerde.

## Commits convencionales

Formato: `<tipo>(<alcance opcional>): <descripción en inglés, imperativo, minúscula>`

| Tipo       | Uso                                                                                   |
| ---------- | ------------------------------------------------------------------------------------- |
| `feat`     | nueva funcionalidad                                                                   |
| `fix`      | corrección de bug                                                                     |
| `docs`     | documentación (agents/, instructions/, .opencode/, docs/, CLAUDE.md, cursor.rules.md) |
| `style`    | formato, sin cambio de lógica                                                         |
| `refactor` | cambio de código sin cambiar comportamiento                                           |
| `perf`     | mejora de rendimiento                                                                 |
| `test`     | tests                                                                                 |
| `build`    | build/deps (package.json, config)                                                     |
| `ci`       | CI/CD                                                                                 |
| `chore`    | mantenimiento                                                                         |

Ejemplos reales del proyecto:

```
feat(appointments): add conflict validation via rpc
fix(finance): round commissions half-up to 2 decimals
feat(calendar): color events by appointment status
docs(database): document commissions snapshot rule
test(e2e): cover finalize appointment flow as receptionist
perf(reports): move monthly aggregation to sql view
```

- Alcance = dominio (`appointments`, `clients`, `finance`, `calendar`,
  `reports`, `auth`, `db`, `ui`).
- Un commit = un cambio lógico coherente. Nada de "fixes" acumulados.
- Body opcional para el "por qué"; referenciar issue con `(#123)` si existe.

## Pull Requests

Título = commit principal (convencional). Descripción con plantilla:

```md
## Qué

<resumen>

## Por qué

<motivo / issue>

## Cómo

<decisiones clave, skills aplicados>

## Pipeline de agentes

architect → database → backend → frontend → qa (security si aplica)

## Cómo probar

<pasos concretos>

## QA Checklist

<pegar checklist de agents/qa.md>

## Screenshots (si es UI)

mobile 375px · desktop · dark mode
```

## Revisión y merge

- Checklist `AGENTS.md` §8 completa antes de pedir review.
- Requiere: CI verde (lint, typecheck, test) + 1 aprobación (+ security para
  auth/RLS/dinero).
- Merge a `dev`: **Squash** por defecto (historial limpio por feature); el
  título del squash = título del PR.
- Merge a `main` (release): **merge commit** para conservar el historial de
  `dev`; el título describe la release.
- Borrar la rama tras merge.

## Secretos y seguridad en Git

- `.env*` en `.gitignore`; nunca commitear claves (revisar el diff siempre).
- Si un secreto se filtró: rotarlo INMEDIATAMENTE (Supabase keys, Vercel) y
  purgar el historial (`git filter-repo`) — rotar > purgar.
- No commitear dumps de DB ni datos reales de clientes (seeds sintéticos solo).

## Releases

- Tags semánticos: `v0.3.0` en cada deploy a producción.
- CHANGELOG.md (cuando exista) generado de commits convencionales.
- Rollback de app = redeploy en Vercel; ver `agents/deployment.md`.
