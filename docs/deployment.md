# deployment.md — Guía de despliegue

> Dueño: **deployment**. Referencia operativa de Supabase + Vercel.
> Reglas y checklists del agente: `agents/deployment.md`.

---

## 1. Arquitectura de despliegue

```
GitHub (main) ──► Vercel (Next.js 16) ──► Supabase (PostgreSQL + Auth + Storage)
     │                 │                        ▲
     │                 └── Preview por PR ────►│ (proyecto staging opcional)
     └── CI: lint + typecheck + test           └── migraciones vía Supabase CLI
```

- Producción: rama `main` en Vercel.
- Previews por PR (verificados con el checklist QA antes de merge).
- Región Vercel recomendada: `iad1` (Washington) — mejor latencia a Nicaragua
  entre regiones disponibles; Supabase en la misma región.

---

## 2. Setup inicial (una vez)

### Supabase

1. Crear proyecto (región cercana, ej. `us-east-1`).
2. Auth → Providers: Email habilitado; URLs de redirect:
   `https://<app>.vercel.app/**` y `http://localhost:3000/**`.
3. Storage: buckets privados `avatars` (trabajadoras) y `service-photos`;
   acceso por signed URLs (nunca públicos).
4. Aplicar schema: `supabase link --project-ref <ref>` y `supabase db push`.
5. Ejecutar seeds de configuración (settings, monedas, catálogo de servicios)
   — **sin** seeds de usuarios demo en producción.
6. Crear la usuaria owner real (invite desde la app o dashboard).
7. Point-in-Time Recovery / backups diarios activados.

### Vercel

1. Importar repo; framework detecta Next.js; build `pnpm build`.
2. Variables de entorno (Production + Preview + Development):

| Variable                        | Valor                                           |
| ------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL del proyecto                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | service role (server only)                      |
| `NEXT_PUBLIC_APP_URL`           | https://citabella.vercel.app (o dominio propio) |
| `CRON_SECRET`                   | secreto aleatorio para `/api/cron/*`            |

3. Activar Vercel Analytics + Speed Insights.
4. Dominio propio (opcional): DNS + SSL automático; actualizar redirect URLs
   en Supabase.

---

## 3. Flujo de release (cada deploy)

```
1. PR → Preview deploy en Vercel
2. QA checklist en el Preview (mobile real si es UI)
3. Merge a main → deploy producción automático
4. Si hubo migraciones: supabase db push ANTES de promocionar tráfico
5. Post-deploy: checklist de humo (abajo)
```

**Orden con cambios de schema**: migración primero, deploy después. Las
migraciones se escriben aditivas (compatibles con el build anterior) y las
destructivas esperan un release.

Comandos de migración:

```bash
supabase db push            # aplica migraciones pendientes al remoto
supabase db reset           # SOLO local: reconstruye y corre seeds
supabase migration list     # verificar estado
```

---

## 4. Checklist post-deploy (humo, 5 min)

- [ ] Login con usuaria real (HTTPS, cookies `secure`).
- [ ] Dashboard: KPIs del día correctos.
- [ ] Crear cita en calendario; color por estado correcto.
- [ ] Finalizar cita: ingreso + comisiones generados; dashboard refresca.
- [ ] `/finance` y `/reports` con owner OK; con receptionist → redirect.
- [ ] PWA instalable; dark mode persiste.
- [ ] Logs Vercel: cero 500; Supabase: cero errores de auth/RLS.

---

## 5. Rollback

| Escenario                 | Acción                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| App rota tras deploy      | Vercel → Deployments → Promote build anterior (inmediato)                                                             |
| Migración fallida         | Las migraciones son aditivas; si una destructiva falló: PITR (Point-in-Time Recovery) + coordinar ajustes con finance |
| Datos incorrectos en caja | NUNCA UPDATE/DELETE en `payments`/`commissions`; notas de ajuste                                                      |
| Secretos comprometidos    | Rotar keys (Supabase → Settings → API; Vercel env) inmediatamente                                                     |

---

## 6. Monitoreo y mantenimiento

- **Vercel**: Analytics, Speed Insights, alertas de deploy.
- **Supabase**: Dashboard → Reports (CPU, conexiones); semanal: slow queries
  de reportes; mensual: revisar índices no usados.
- **Backups**: verificar PITR y hacer dump mensual externo
  (`supabase db dump -f backup.sql`).
- **Cron**: `/api/cron/reminders` diariamente 19:00 Managua (recordatorios del
  día siguiente) — configurar en `vercel.json` con `CRON_SECRET`.

---

## 7. Entornos

| Entorno    | Rama   | Supabase                       | Datos           |
| ---------- | ------ | ------------------------------ | --------------- |
| Local      | —      | `supabase start` (local)       | seeds demo      |
| Preview    | PRs    | proyecto staging o local túnel | datos de prueba |
| Production | `main` | proyecto producción            | datos reales    |

Regla: nada de datos reales fuera de producción; nada de pruebas destructivas
en producción.
