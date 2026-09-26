import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { managuaWallToUtcISO } from "@/lib/dates";

/**
 * Cron de recordatorios (diario, 01:00 UTC = 19:00 Managua).
 * Crea notificaciones para la dueña y la trabajadora asignada de cada cita
 * de mañana (pendiente/confirmada). Idempotente por índice único
 * (user_id, type, appointment_id). Protegido con CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Mañana en Managua (pared de calendario, no aritmética de ms)
  const tomorrowParts = (() => {
    const [y, m, d] = new Date(Date.now() - 6 * 3600 * 1000 + 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10)
      .split("-");
    return { year: Number(y), month: Number(m), day: Number(d) };
  })();
  const tomorrowStart = managuaWallToUtcISO(
    `${tomorrowParts.year}-${String(tomorrowParts.month).padStart(2, "0")}-${String(tomorrowParts.day).padStart(2, "0")}`,
    "00:00",
  );
  const tomorrowEnd = managuaWallToUtcISO(
    `${tomorrowParts.year}-${String(tomorrowParts.month).padStart(2, "0")}-${String(tomorrowParts.day).padStart(2, "0")}`,
    "23:59",
  );

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      `id, starts_at, status, client:clients ( full_name ), employee:employees ( id, full_name, user:users!employees_user_id_fkey ( id ) )`,
    )
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", tomorrowStart)
    .lte("starts_at", tomorrowEnd);

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // Destinatarios: dueña + user de la trabajadora de cada cita
  const { data: owner } = await supabase
    .from("users")
    .select("id")
    .eq("role", "owner")
    .single();

  let created = 0;
  for (const appt of appointments ?? []) {
    const clientName =
      (appt.client as { full_name?: string } | null)?.full_name ?? "tu cliente";
    const employeeName =
      (appt.employee as { full_name?: string } | null)?.full_name ?? "";
    const time = new Date(appt.starts_at).toLocaleTimeString("es-NI", {
      timeZone: "America/Managua",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const title = `Recordatorio: ${clientName} mañana ${time}`;
    const body = `Cita de ${clientName} mañana a las ${time}${
      employeeName ? ` con ${employeeName}` : ""
    }.`;

    const recipients = new Set<string>();
    if (owner?.id) recipients.add(owner.id);
    const employeeUser = (appt.employee as { user?: { id?: string } } | null)
      ?.user;
    if (employeeUser?.id) recipients.add(employeeUser.id);

    for (const userId of recipients) {
      const { data, error: insertError } = await supabase
        .from("notifications")
        .upsert(
          {
            user_id: userId,
            type: "reminder",
            title,
            body,
            appointment_id: appt.id,
          },
          { onConflict: "user_id,type,appointment_id", ignoreDuplicates: true },
        )
        .select("id");
      if (insertError) {
        return NextResponse.json(
          { error: "DB_ERROR", detail: insertError.message },
          { status: 500 },
        );
      }
      if (data?.length) created += 1;
    }
  }

  return NextResponse.json({ ok: true, created });
}
