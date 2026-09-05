/**
 * Verificación de RLS y reglas de negocio contra Supabase local.
 * Uso: node scripts/verify-rls.mjs   (requiere `supabase start` + seed)
 *
 * Verifica: login de los 3 roles, filtrado por rol (RLS), bloqueos de
 * escritura, conflictos de horario (SLOT_TAKEN), horario laboral
 * (OUT_OF_SCHEDULE) y finalización con comisiones (snapshot 60/40 de Betty).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Carga .env.local simple (KEY=VALUE por línea)
function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(
      new URL("../.env.local", import.meta.url),
      "utf8",
    ).split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {
    /* usar defaults */
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "demo1234";

let passed = 0;
let failed = 0;

function ok(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

async function clientAs(email) {
  const c = createClient(SUPABASE_URL, ANON);
  const { error } = await c.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error)
    throw new Error(
      `No se pudo iniciar sesión como ${email}: ${error.message}`,
    );
  return c;
}

async function expectError(name, resultPromise, expectedCode) {
  // supabase-js nunca lanza: devuelve { data, error }
  const res = await resultPromise;
  const err = res?.error;
  if (!err) {
    ok(name, false, "(no hubo error)");
    return;
  }
  const text = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""} ${err.code ?? ""}`;
  ok(name, text.includes(expectedCode), `(obtuvo: ${text.slice(0, 140)})`);
}

function managuaWall(hours, daysAhead = 0, minutes = 0) {
  // Instante UTC equivalente a (hoy + daysAhead) a las hours:minutes en Managua (UTC-6)
  const now = new Date();
  const base = new Date(now.getTime() - 6 * 3600 * 1000);
  base.setUTCDate(base.getUTCDate() + daysAhead);
  base.setUTCHours(hours + 6, minutes, 0, 0);
  return base.toISOString();
}

function nextWorkdayWall(hours, minutes = 0) {
  // Primer día laborable (no domingo) a partir de mañana, en Managua
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const now = new Date();
    const base = new Date(now.getTime() - 6 * 3600 * 1000);
    base.setUTCDate(base.getUTCDate() + daysAhead);
    if (base.getUTCDay() !== 0) {
      base.setUTCHours(hours + 6, minutes, 0, 0);
      return base.toISOString();
    }
  }
  throw new Error("No se encontró día laborable");
}

const service = createClient(SUPABASE_URL, SERVICE);

async function main() {
  console.log("\n════ CitaBella — verificación RLS + negocio (local) ════\n");
  console.log("1. Login de los 3 roles");
  const owner = await clientAs("owner@demo.ni");
  const ana = await clientAs("ana@demo.ni");
  const recep = await clientAs("recep@demo.ni");
  ok("owner/ana/recep inician sesión", true);

  console.log("\n2. Dueña ve todo");
  {
    const appts = await owner.from("appointments").select("id");
    const commissions = await owner.from("commissions").select("id");
    const payments = await owner.from("payments").select("id");
    const users = await owner.from("users").select("id");
    const settings = await owner.from("settings").select("key");
    ok(
      `appointments (${appts.data?.length ?? 0} ≥ 6)`,
      (appts.data?.length ?? 0) >= 6,
      appts.error?.message,
    );
    ok(
      `commissions (${commissions.data?.length ?? 0} ≥ 2)`,
      (commissions.data?.length ?? 0) >= 2,
      commissions.error?.message,
    );
    ok(
      `payments (${payments.data?.length ?? 0} ≥ 2)`,
      (payments.data?.length ?? 0) >= 2,
      payments.error?.message,
    );
    ok(
      `users (${users.data?.length ?? 0} = 5)`,
      users.data?.length === 5,
      users.error?.message,
    );
    ok(
      `settings (${settings.data?.length ?? 0} = 6)`,
      settings.data?.length === 6,
      settings.error?.message,
    );
  }

  console.log("\n3. Trabajadora (Ana) solo ve lo suyo");
  {
    const appts = await ana
      .from("appointments")
      .select("*, employee:employees(full_name)");
    const allAna = (appts.data ?? []).every(
      (a) => a.employee.full_name === "Ana López",
    );
    ok(
      `solo citas de Ana (${appts.data?.length ?? 0})`,
      appts.data?.length >= 1 && allAna,
      appts.error?.message,
    );

    const comms = await ana
      .from("commissions")
      .select("*, employee:employees(full_name)");
    ok(
      `solo comisiones de Ana (${comms.data?.length ?? 0})`,
      (comms.data ?? []).every((c) => c.employee.full_name === "Ana López"),
      comms.error?.message,
    );

    const payments = await ana.from("payments").select("id");
    ok(
      "NO ve payments",
      (payments.data ?? []).length === 0,
      payments.error?.message,
    );

    const users = await ana.from("users").select("id");
    ok("users: solo su fila", users.data?.length === 1, users.error?.message);

    const clientsAll = await owner.from("clients").select("id");
    const clientsAna = await ana.from("clients").select("id");
    ok(
      `clients: subset propio (${clientsAna.data?.length} de ${clientsAll.data?.length})`,
      (clientsAna.data?.length ?? 0) > 0 &&
        (clientsAna.data?.length ?? 0) <= (clientsAll.data?.length ?? 0),
      clientsAna.error?.message,
    );

    await expectError(
      "NO puede crear clientes",
      ana.from("clients").insert({ full_name: "X", phone: "+50584129999" }),
      "42501",
    );
  }

  console.log("\n4. Recepcionista: agenda sí, dinero no");
  {
    const appts = await recep.from("appointments").select("id");
    ok(
      `ve todas las citas (${appts.data?.length ?? 0} ≥ 6)`,
      (appts.data?.length ?? 0) >= 6,
      appts.error?.message,
    );

    const clients = await recep.from("clients").select("id");
    ok(
      `ve clientes (${clients.data?.length ?? 0} = 5)`,
      clients.data?.length === 5,
      clients.error?.message,
    );

    const payments = await recep.from("payments").select("id");
    ok(
      "NO ve payments",
      (payments.data ?? []).length === 0,
      payments.error?.message,
    );

    const commissions = await recep.from("commissions").select("id");
    ok(
      "NO ve commissions",
      (commissions.data ?? []).length === 0,
      commissions.error?.message,
    );

    const audit = await recep.from("audit_logs").select("id");
    ok(
      "NO ve audit_logs",
      (audit.data ?? []).length === 0,
      audit.error?.message,
    );

    await expectError(
      "NO puede crear servicios",
      recep.from("services").insert({
        name: "X",
        price_nio: 1,
        price_usd: 1,
        duration_minutes: 30,
      }),
      "42501",
    );
  }

  console.log(
    "\n5. Conflicto de horario (SLOT_TAKEN) y horario laboral (OUT_OF_SCHEDULE)",
  );
  {
    // Limpieza de corridas anteriores (citas de prueba pendientes/confirmadas en esos slots)
    const slots = [
      nextWorkdayWall(13),
      nextWorkdayWall(14),
      nextWorkdayWall(18),
      nextWorkdayWall(19),
    ];
    await service
      .from("appointments")
      .delete()
      .in("status", ["pending", "confirmed"])
      .in("starts_at", slots);

    const anaId = (
      await owner
        .from("employees")
        .select("id")
        .eq("full_name", "Ana López")
        .single()
    ).data.id;
    const corteId = (
      await owner
        .from("services")
        .select("id")
        .eq("name", "Corte mujer")
        .single()
    ).data.id;
    const mariaId = (
      await owner
        .from("clients")
        .select("id")
        .eq("full_name", "María José Rivas")
        .single()
    ).data.id;

    // Ana tiene cita HOY 09:00 (seed) → solapado SLOT_TAKEN
    await expectError(
      "cita solapada rechazada",
      owner.rpc("create_appointment_safe", {
        p_input: {
          client_id: mariaId,
          employee_id: anaId,
          starts_at: managuaWall(9),
          ends_at: managuaWall(10),
          currency: "NIO",
          price: 350,
          discount: 0,
          services: [
            {
              service_id: corteId,
              price: 350,
              discount: 0,
              duration_minutes: 45,
            },
          ],
        },
      }),
      "SLOT_TAKEN",
    );

    // Cita válida el próximo día laborable 13:00-13:45 (dentro del horario de Ana)
    const created = await owner.rpc("create_appointment_safe", {
      p_input: {
        client_id: mariaId,
        employee_id: anaId,
        starts_at: nextWorkdayWall(13),
        ends_at: nextWorkdayWall(14),
        currency: "NIO",
        price: 350,
        discount: 0,
        services: [
          {
            service_id: corteId,
            price: 350,
            discount: 0,
            duration_minutes: 45,
          },
        ],
      },
    });
    ok(
      "cita válida creada (próximo laborable 13:00)",
      !created.error,
      created.error?.message,
    );

    // Solapada con la recién creada → SLOT_TAKEN
    await expectError(
      "cita solapada con la nueva rechazada",
      owner.rpc("create_appointment_safe", {
        p_input: {
          client_id: mariaId,
          employee_id: anaId,
          starts_at: nextWorkdayWall(13),
          ends_at: nextWorkdayWall(14),
          currency: "NIO",
          price: 350,
          discount: 0,
          services: [
            {
              service_id: corteId,
              price: 350,
              discount: 0,
              duration_minutes: 45,
            },
          ],
        },
      }),
      "SLOT_TAKEN",
    );

    // Fuera de horario (18:00, Ana trabaja 8-17) → OUT_OF_SCHEDULE
    await expectError(
      "cita fuera de horario rechazada",
      owner.rpc("create_appointment_safe", {
        p_input: {
          client_id: mariaId,
          employee_id: anaId,
          starts_at: nextWorkdayWall(18),
          ends_at: nextWorkdayWall(19),
          currency: "NIO",
          price: 350,
          discount: 0,
          services: [
            {
              service_id: corteId,
              price: 350,
              discount: 0,
              duration_minutes: 45,
            },
          ],
        },
      }),
      "OUT_OF_SCHEDULE",
    );
  }

  console.log(
    "\n6. Finalizar cita: snapshot de comisiones (Betty 60/40) e inmutabilidad",
  );
  {
    const bettyId = (
      await owner
        .from("employees")
        .select("id")
        .eq("full_name", "Betty Ruiz")
        .single()
    ).data.id;
    const maniId = (
      await owner.from("services").select("id").eq("name", "Manicure").single()
    ).data.id;
    const karlaId = (
      await owner
        .from("clients")
        .select("id")
        .eq("full_name", "Karla Espinoza")
        .single()
    ).data.id;

    const created = await owner.rpc("create_appointment_safe", {
      p_input: {
        client_id: karlaId,
        employee_id: bettyId,
        starts_at: managuaWall(13),
        ends_at: managuaWall(14),
        currency: "NIO",
        price: 400,
        discount: 0,
        services: [
          { service_id: maniId, price: 400, discount: 0, duration_minutes: 60 },
        ],
      },
    });
    ok("cita de Betty creada", !created.error, created.error?.message);
    const apptId = created.data?.appointment?.id;

    const receipt = await owner.rpc("complete_appointment", {
      p_appointment_id: apptId,
      p_method: "cash",
      p_tip: 20,
    });
    ok("finalización exitosa", !receipt.error, receipt.error?.message);
    ok(
      "monto 400 + propina 20",
      receipt.data?.amount === 400 && receipt.data?.tip === 20,
      JSON.stringify(receipt.data),
    );

    const comm = await owner
      .from("commissions")
      .select("*")
      .eq("appointment_id", apptId)
      .single();
    ok(
      "snapshot Betty 60% → 240/160",
      comm.data?.employee_amount === 240 &&
        comm.data?.owner_amount === 160 &&
        comm.data?.employee_pct === 60,
      JSON.stringify(comm.data),
    );

    await expectError(
      "finalizar dos veces rechazado",
      owner.rpc("complete_appointment", { p_appointment_id: apptId }),
      "APPOINTMENT_ALREADY_COMPLETED",
    );

    await expectError(
      "payments inmutable (UPDATE bloqueado)",
      service
        .from("payments")
        .update({ amount: 1 })
        .eq("appointment_id", apptId),
      "IMMUTABLE_RECORD",
    );
    await expectError(
      "commissions inmutable (DELETE bloqueado)",
      service.from("commissions").delete().eq("appointment_id", apptId),
      "IMMUTABLE_RECORD",
    );
  }

  console.log(
    "\n7. Ejemplo canónico de comisión (base C$ 1,000 · Ana 55% → 550/450)",
  );
  {
    // Servicio de prueba con precio exacto de la regla de negocio
    const { data: svc } = await service
      .from("services")
      .insert({
        name: "Test comisión base",
        price_nio: 1000,
        price_usd: 27.17,
        duration_minutes: 60,
        is_active: true,
      })
      .select("id")
      .single();
    const anaId = (
      await owner
        .from("employees")
        .select("id")
        .eq("full_name", "Ana López")
        .single()
    ).data.id;
    const mariaId = (
      await owner
        .from("clients")
        .select("id")
        .eq("full_name", "María José Rivas")
        .single()
    ).data.id;

    const created = await owner.rpc("create_appointment_safe", {
      p_input: {
        client_id: mariaId,
        employee_id: anaId,
        starts_at: managuaWall(16),
        ends_at: managuaWall(17),
        currency: "NIO",
        price: 1000,
        discount: 0,
        services: [
          {
            service_id: svc.id,
            price: 1000,
            discount: 0,
            duration_minutes: 60,
          },
        ],
      },
    });
    ok("cita de prueba creada", !created.error, created.error?.message);

    const receipt = await owner.rpc("complete_appointment", {
      p_appointment_id: created.data?.appointment?.id,
      p_method: "cash",
      p_tip: 0,
    });
    ok("finalización exitosa", !receipt.error, receipt.error?.message);
    ok(
      "ingreso 1000.00",
      Number(receipt.data?.amount) === 1000,
      JSON.stringify(receipt.data),
    );

    const comm = await owner
      .from("commissions")
      .select("*")
      .eq("appointment_id", created.data?.appointment?.id)
      .single();
    ok(
      "Ana 55% → 550.00 / dueña 450.00",
      Number(comm.data?.employee_amount) === 550 &&
        Number(comm.data?.owner_amount) === 450 &&
        Number(comm.data?.employee_pct) === 55,
      JSON.stringify(comm.data),
    );

    await service
      .from("services")
      .update({ is_active: false })
      .eq("id", svc.id);
  }

  console.log(`\n════ Resultado: ${passed} ✓ · ${failed} ✗ ════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Error fatal:", e.message);
  process.exit(1);
});
