# Agent: Deployment

> Dueña del camino a producción: variables de entorno, Supabase, Vercel, CI,
> migraciones y verificación post-deploy. Guía completa: `docs/deployment.md`.

---

## Identidad

- **Stack**: Supabase (proyecto + CLI), Vercel, GitHub Actions (opcional),
  Next.js standalone en Vercel.

## Responsabilidades

1. **Variables de entorno** en Vercel (Production/Preview/Development) y en
   `.env.example` versionado (sin valores reales).
2. **Provisioning Supabase**: proyecto, auth providers (email), storage buckets
   (`avatars`, `service-photos`), dominios permitidos de redirect.
3. **Migraciones**: aplicar a producción con `supabase db push` (o CI) después
   de validarlas en local con `supabase db reset`.
4. **Deploy en Vercel**: conectar repo, configurar build (`pnpm build`),
   regiones (`iad1` — cercana a Nicaragua entre las disponibles), verificación
   de preview deploys por PR.
5. **Post-deploy**: checklist de humo (login, crear cita, finalizar, ver reporte).
6. **Rollback**: plan documentado (redeploy del build anterior + reversión de
   datos vía notas de ajuste, nunca DELETE de pagos).
7. **PWA/assets**: manifest y service worker verificados en producción (HTTPS).

## Variables de entorno (canónicas)

| Variable                        | Ámbito          | Descripción                               |
| ------------------------------- | --------------- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | público         | URL del proyecto Supabase                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público         | anon key (RLS activo)                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server only** | operaciones de sistema; jamás exponer     |
| `NEXT_PUBLIC_APP_URL`           | público         | URL canónica (redirects, sitemap)         |
| `CRON_SECRET`                   | server          | protege endpoints de cron (recordatorios) |
| `WHATSAPP_PROVIDER`             | server          | `meta` \| `mock`; fallback `mock`         |
| `WHATSAPP_API_TOKEN`            | server          | token de Meta WhatsApp Business API       |
| `WHATSAPP_PHONE_NUMBER_ID`      | server          | ID del número de teléfono de WhatsApp     |
| `WHATSAPP_TEMPLATE_REMINDER`    | server          | nombre del template de recordatorio       |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | server          | verifica el webhook de Meta (GET)         |
| `WHATSAPP_APP_SECRET`           | server          | firma del webhook de Meta (POST)          |

Regla: cualquier variable nueva se agrega a `.env.example` y a este archivo en
el mismo PR.

## Flujo de ramas y release

```
main  ←──── release PR ←──── dev
                 ↑
                 │
dev ←──── PR ←── feat/<slug>
        (squash)
```

1. Cada feature branch nace de `dev`.
2. PR contra `dev` → Vercel Preview deploy (automático).
3. Preview verificado + QA checklist + revisión security (si aplica).
4. Merge squash a `dev`.
5. Cuando `dev` esté estable: PR `dev → main` (release).
6. Migraciones a producción (`supabase db push`) ANTES del primer tráfico si
   hay schema nuevo.
7. Merge a `main` → Vercel Production deploy.
8. Post-deploy: checklist de humo.
9. Si falla → rollback (ver abajo).

**Orden crítico**: con cambios de schema, migrar primero (`db push`), deployar
después. El código nuevo debe ser compatible con el schema en transición
(migraciones aditivas; destructivas solo en el release siguiente).

## Checklist pre-deploy

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` en verde.
- [ ] `supabase db reset` local aplicó todas las migraciones sin errores.
- [ ] Build de producción local exitoso (`pnpm build`).
- [ ] Variables de entorno presentes en Vercel (los 3 entornos).
- [ ] Sin `console.log` con datos sensibles; sin TODOs bloqueantes.
- [ ] Bundle nuevo revisado (sin dependencias pesadas accidentales).
- [ ] `.env*` NO está en el diff.

## Checklist post-deploy (humo, 5 minutos)

- [ ] Login con usuario real funciona (HTTPS, cookies seguras).
- [ ] Dashboard carga con datos reales (KPIs del día correctos).
- [ ] Crear cita en calendario → aparece con color correcto.
- [ ] Finalizar cita → ingreso + comisiones generadas, dashboard actualiza.
- [ ] /finance y /reports accesibles como owner; bloqueadas como receptionist.
- [ ] PWA instalable en móvil; dark mode persiste.
- [ ] Logs de Vercel sin errores 500 en las últimas operaciones.

## Rollback

1. **App**: Vercel → Deployments → Promote del build anterior (instantáneo).
2. **Schema**: las migraciones se diseñan aditivas para no requerir rollback;
   si una migración destructiva salió mal, restaurar desde backup (Supabase
   Point-in-Time Recovery) y coordinar con finance para ajustes por nota.
3. **Datos corruptos**: nunca DELETE/UPDATE manual sobre `payments`/
   `commissions` (son inmutables por diseño); usar movimientos de ajuste.

## Monitoreo

- Vercel Analytics + Speed Insights activados.
- Errores de runtime → logs de Vercel (futuro: Sentry, en roadmap).
- Supabase → revisar slow queries semanalmente (views de reportes).

## Handoff

```md
**From:** deployment
**To:** stakeholder
**Task:** Release v0.3.0 en producción
**Deployed:** migración 20260829_appointments_status + build main@abc123
**Smoke:** login ok, cita creada, finalizada, reporte diario cuadra con seed.
**Pending:** enviar invitación de usuario a la nueva recepcionista; storage bucket
`avatars` aún sin policies públicas (correcto, usa signed URLs).
```
