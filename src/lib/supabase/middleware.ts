import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login"]);

/**
 * Refresca la sesión de Supabase y aplica el gating grueso de rutas.
 * La decisión fina de permisos la toman RLS y los layouts/pages (server).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.has(pathname);

  // "/" y assets no requieren sesión: evita un roundtrip de auth por request
  if (pathname === "/") {
    return supabaseResponse;
  }

  let user = null;
  try {
    // Importante: getUser() valida el JWT contra el servidor Auth.
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    // Auth inalcanzable (p. ej. supabase local detenido): tratar como sin sesión.
    user = null;
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Solo next paths internas (anti open-redirect)
    if (!isPublic && pathname !== "/") url.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return supabaseResponse;
}
