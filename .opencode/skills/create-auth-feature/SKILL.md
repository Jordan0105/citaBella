---
name: create-auth-feature
description: "Use when creating or modifying authentication, session, roles or access control: Supabase Auth, signIn/login page, getAuthContext, middleware route gating, owner-only user creation, role/password changes, logout, redirect whitelists, and the security checklist for owner/worker/receptionist. Triggers: login, sesión, session, middleware, rol, signIn, reset password."
---

# Skill: create-auth-feature

> Receta para todo lo relacionado a autenticación, sesión y roles. Dueños:
> **security** + **backend**. Lee `agents/security.md`, `docs/permissions.md`.

## Modelo de auth de CitaBella

- Supabase Auth (email + contraseña). Una fila en `public.users` por usuario
  (creada por trigger `on_auth_user_created`), con `role` y `employee_id`.
- El rol vive SOLO en `public.users` (server-side). El cliente puede leerlo
  para UX, jamás para autorizar.
- 3 roles: `owner` | `worker` | `receptionist`.

## Paso 1 — Sesión (ya implementado por defecto; referencia)

```ts
// src/lib/supabase/server.ts — cliente con cookies (@supabase/ssr)
createServerClient(url, anon, { cookies: { getAll, setAll } });

// src/features/auth/queries/get-auth-context.ts — helper canónico
export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // valida JWT real
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("id, role, employee_id, is_active, full_name")
    .eq("id", user.id)
    .single();
  if (!data?.is_active) return null;
  return data;
}
```

## Paso 2 — Login (página + action)

```tsx
// src/app/(auth)/login/page.tsx — server component con form client
// src/features/auth/actions/sign-in.ts
"use server";
export async function signIn(input: SignInInput): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse(input); // email + password
  if (!parsed.success) return validationError(parsed);
  if (!(await rateLimit("signIn", { max: 5, windowSec: 60 })))
    return rateLimited();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Credenciales incorrectas" },
    };

  redirect("/dashboard"); // redirect en action es válido y preferido aquí
}
```

- Mensaje de error genérico (no revelar si existe el email).
- UI: diseño boutique (ver uiux), label email/contraseña, botón loading,
  link "¿Olvidaste tu contraseña?" (reset por email).

## Paso 3 — Gating de rutas (middleware)

```ts
// src/middleware.ts — resumen
// 1. refresh de sesión con supabase.middleware (updateSession)
// 2. sin usuario + ruta privada → /login?next=<ruta>  (validar next: solo rutas internas)
// 3. con usuario + /login → /dashboard
// 4. rutas owner (/finance, /reports, /settings): check rol desde cookie de perfil
//    (grueso; la decisión fina la hace el server + RLS)
```

## Paso 4 — Alta de usuarios (owner only)

- `createUser(input)`: action owner-only; usa `admin.ts` (service role) SOLO
  aquí, en server; crea `auth.users` + fila `public.users` con rol y
  `employee_id` (si worker); envía invite por email (`inviteUserByEmail`).
- Edge cases: email duplicado → mensaje claro; usuario inactivo no loguea.

## Paso 5 — Cambios de rol / contraseñas

- `updateUserRole(id, role)`: owner only + auditoría (`audit_logs`).
- Cambio de contraseña propio: `updatePassword` (re-auth con contraseña actual).
- Reset: flujo estándar Supabase (email) con redirect validado (solo rutas
  internas — anti open-redirect).

## Paso 6 — Logout

- `signOut()` en action + botón en el menú de usuario (desktop y móvil).
- `signOut({ scope: "global" })` para revocar otras sesiones.

## Paso 7 — Checklist de seguridad (security agent)

- [ ] RLS de `users`: un usuario solo lee su fila; owner lee todas.
- [ ] `fn_current_role()` es la única fuente de rol en policies.
- [ ] Cookies: `httpOnly`, `secure` (prod), `sameSite=lax`.
- [ ] Rate limit en signIn (5/min) y reset password.
- [ ] Sin mensajes que enumeren emails.
- [ ] `next` de redirects validado contra whitelist de prefijos internos.
- [ ] Middleware protege TODAS las rutas privadas (probar sin sesión).
- [ ] Tests E2E: login 3 roles, acceso cruzado bloqueado, logout limpia estado.
- [ ] Usuario desactivado: sesión existente queda sin acceso (check is_active
      en getAuthContext).

## Anti-patrones

- Guardar `role` en localStorage y confiar en él.
- API routes propias para login (usar auth de Supabase + cookies).
- Service role key fuera de `lib/supabase/admin.ts` + server only.
- Mostrar qué campo falló en login (email vs contraseña).
