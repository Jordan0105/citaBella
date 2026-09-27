import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy (antes middleware) — Next.js 16 renombró la convención.
 * Refresca la sesión y aplica el gating grueso de rutas.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todo excepto assets estáticos, imágenes y rutas de API server-to-server
     * (webhooks de Meta y cron de Vercel se protegen por su propio secreto).
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
