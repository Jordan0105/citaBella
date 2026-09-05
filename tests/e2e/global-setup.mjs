/**
 * Setup global de E2E: garantiza estado determinista contra Supabase local.
 * 1. Elimina citas marcadas con notas "e2e" (creadas por corridas previas).
 * 2. Asegura que exista UNA cita en proceso (Betty · Manicure + Pedicure).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(
      new URL("../../.env.local", import.meta.url),
      "utf8",
    ).split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {
    /* defaults locales */
  }
  return env;
}

const env = loadEnv();
const service = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  env.SUPABASE_SERVICE_ROLE_KEY,
);

function futureWall(minutesFromNow) {
  // Instante relativo a ahora: siempre dentro de la ventana "próximos 7 días"
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

export default async function globalSetup() {
  // 1. Limpiar citas de corridas E2E previas (pendientes/confirmadas)
  const { data: leftovers } = await service
    .from("appointments")
    .select("id")
    .eq("notes", "e2e")
    .in("status", ["pending", "confirmed"]);
  if (leftovers?.length) {
    await service
      .from("appointments")
      .delete()
      .in(
        "id",
        leftovers.map((a) => a.id),
      );
  }

  // 1b. Limpiar gastos de corridas E2E previas (no son inmutables)
  await service.from("expenses").delete().like("description", "Gasto e2e%");

  // 1c. Limpiar recordatorios previos: el cron debe partir de cero
  await service.from("notifications").delete().eq("type", "reminder");

  // 1c. Limpiar citas de prueba de las últimas 2 h (con o sin marca e2e):
  //     solo client_id de "María José Rivas" y futuras (el seed no crea
  //     citas futuras de este cliente; cread_at filtra filas del seed).
  const maria = await service
    .from("clients")
    .select("id")
    .eq("full_name", "María José Rivas")
    .single();
  if (maria.data?.id) {
    const { data: testAppts } = await service
      .from("appointments")
      .select("id")
      .eq("client_id", maria.data.id)
      .eq("status", "pending")
      .gte("starts_at", new Date().toISOString())
      .gte("created_at", new Date(Date.now() - 2 * 3600_000).toISOString());
    if (testAppts?.length) {
      await service
        .from("appointments")
        .delete()
        .in(
          "id",
          testAppts.map((a) => a.id),
        );
    }
  }

  // 2. Citas en proceso frescas (una por proyecto E2E), empezando pronto
  //    para que caigan en la ventana "próximos 7 días" (gte now).
  await service.from("appointments").delete().eq("status", "in_progress");

  const employeeBetty = await service
    .from("employees")
    .select("id")
    .eq("full_name", "Betty Ruiz")
    .single();
  const clientBetty = await service
    .from("clients")
    .select("id")
    .eq("full_name", "Karla Espinoza")
    .single();
  const servicesBetty = await service
    .from("services")
    .select("id, price_nio, duration_minutes")
    .in("name", ["Manicure", "Pedicure"]);

  async function createInProgress(employeeId, clientId, lines, startISO) {
    const start = startISO;
    const end = new Date(new Date(start).getTime() + 90 * 60_000).toISOString();
    const { data: appointment, error } = await service
      .from("appointments")
      .insert({
        client_id: clientId,
        employee_id: employeeId,
        starts_at: start,
        ends_at: end,
        status: "in_progress",
        currency: "NIO",
        price: lines.reduce((s, l) => s + l.price, 0),
        discount: 0,
      })
      .select("id")
      .single();
    if (error)
      throw new Error(
        `globalSetup: no se pudo crear la cita en proceso: ${error.message}`,
      );
    await service.from("appointment_services").insert(
      lines.map((l) => ({
        appointment_id: appointment.id,
        service_id: l.service_id,
        price: l.price,
        discount: 0,
        currency: "NIO",
        duration_minutes: l.duration_minutes,
      })),
    );
  }

  const bettyLines = servicesBetty.data.map((s) => ({
    service_id: s.id,
    price: Number(s.price_nio),
    duration_minutes: s.duration_minutes,
  }));
  await createInProgress(
    employeeBetty.data.id,
    clientBetty.data.id,
    bettyLines,
    futureWall(10),
  );

  // Segunda (Ana · María · Corte mujer, arranca un poco más tarde)
  const employeeAna = await service
    .from("employees")
    .select("id")
    .eq("full_name", "Ana López")
    .single();
  const clientAna = await service
    .from("clients")
    .select("id")
    .eq("full_name", "María José Rivas")
    .single();
  const corte = await service
    .from("services")
    .select("id, price_nio, duration_minutes")
    .eq("name", "Corte mujer")
    .single();
  await createInProgress(
    employeeAna.data.id,
    clientAna.data.id,
    [
      {
        service_id: corte.data.id,
        price: Number(corte.data.price_nio),
        duration_minutes: corte.data.duration_minutes,
      },
    ],
    futureWall(25),
  );
}
