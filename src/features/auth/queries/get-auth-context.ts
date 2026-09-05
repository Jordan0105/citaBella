import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db.generated";

export type AuthRole = Database["public"]["Enums"]["user_role"];

export interface AuthContext {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
  employeeId: string | null;
}

/**
 * Contexto de autenticación del servidor. La fuente de verdad del rol es
 * public.users vía la sesión (RLS la refuerza); el cliente nunca autoriza.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, full_name, role, employee_id, is_active")
    .eq("id", user.id)
    .single();

  if (!data?.is_active) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role as AuthRole,
    employeeId: (data.employee_id as string | null) ?? null,
  };
}

/** Gate para páginas solo-owner (finanzas, reportes, settings). */
export async function requireOwner(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "owner") redirect("/dashboard");
  return auth;
}
