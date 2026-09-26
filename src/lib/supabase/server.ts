import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/db.generated";

/**
 * Cliente Supabase para Server Components y Server Actions.
 * Usa la sesión del usuario (RLS activo). Nunca exponer al cliente.
 */
export async function createClient(): Promise<SupabaseClient<
  Database,
  "public"
>> {
  const cookieStore = await cookies();

  return createServerClient<Database, "public">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Llamado desde un Server Component: el middleware refresca
            // las sesiones antes de que lleguen aquí.
          }
        },
      },
    },
  );
}

/**
 * Cliente con service role: SOLO server, para tareas de sistema
 * (crear usuarios, webhooks, cron). Rodear siempre de auth checks propios.
 */
export function createAdminClient(): SupabaseClient<Database, "public"> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada");
  }

  return createServerClient<Database, "public">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
}
