import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWhatsAppSignature } from "@/lib/notifications/webhook";
import {
  normalizeWhatsAppPhone,
  type WhatsAppMessageStatus,
} from "@/lib/notifications";
import { parseConfirmationResponse } from "@/lib/notifications/parse-incoming";
import type { Database } from "@/types/db.generated";

const SIGNATURE_HEADER = "x-hub-signature-256";
const META_PROVIDER = "meta";

type Tables = Database["public"]["Tables"];
type AppointmentRow = Tables["appointments"]["Row"];

/**
 * Verificación del webhook de Meta (GET).
 * Meta envía hub.mode=subscribe, hub.verify_token y hub.challenge.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

/**
 * Eventos de Meta (POST): actualizaciones de estado de mensajes y mensajes
 * entrantes del cliente (confirmaciones/cancelaciones).
 * Verifica la firma HMAC SHA256 con WHATSAPP_APP_SECRET.
 */
export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  const signature = request.headers.get(SIGNATURE_HEADER);
  const body = await request.text();

  if (!signature || !verifyWhatsAppSignature(body, signature, appSecret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 403 });
  }

  const payload = JSON.parse(body) as WhatsAppWebhookPayload;
  const supabase = createAdminClient();

  await Promise.all([
    processStatusUpdates(supabase, payload),
    processIncomingMessages(supabase, payload),
  ]);

  return NextResponse.json({ ok: true });
}

async function processStatusUpdates(
  supabase: ReturnType<typeof createAdminClient>,
  payload: WhatsAppWebhookPayload,
): Promise<void> {
  const statuses = extractStatuses(payload);
  for (const status of statuses) {
    const mapped = mapStatus(status.status);
    if (!mapped) continue;

    const updates: {
      status: WhatsAppMessageStatus;
      delivered_at?: string;
      read_at?: string;
      error_message?: string;
    } = { status: mapped };

    if (mapped === "delivered") updates.delivered_at = new Date().toISOString();
    if (mapped === "read") updates.read_at = new Date().toISOString();
    if (mapped === "failed") {
      updates.error_message = status.errors?.[0]?.message ?? "Error de entrega";
    }

    await supabase
      .from("whatsapp_messages")
      .update(updates)
      .eq("provider_message_id", status.id)
      .eq("provider", META_PROVIDER);
  }
}

async function processIncomingMessages(
  supabase: ReturnType<typeof createAdminClient>,
  payload: WhatsAppWebhookPayload,
): Promise<void> {
  const messages = extractMessages(payload);
  for (const message of messages) {
    await processIncomingMessage(supabase, message);
  }
}

async function processIncomingMessage(
  supabase: ReturnType<typeof createAdminClient>,
  message: WhatsAppIncomingMessage,
): Promise<void> {
  const phone = normalizeWhatsAppPhone(message.from);

  // Idempotencia: un mismo mensaje de Meta no se procesa dos veces.
  const { data: existing } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("provider_message_id", message.id)
    .eq("provider", META_PROVIDER)
    .eq("direction", "inbound")
    .maybeSingle();
  if (existing) return;

  const client = await findClientByPhone(supabase, phone);
  const appointment = client
    ? await findNextActiveAppointment(supabase, client.id)
    : null;

  const intent = parseConfirmationResponse(message.text.body);
  const actionTaken: "confirmed" | "cancelled" | "ignored" =
    intent ?? "ignored";

  if (appointment && intent) {
    await applyIntent(supabase, appointment, intent, message.text.body);
  }

  await supabase.from("whatsapp_messages").insert({
    client_id: client?.id ?? null,
    appointment_id: appointment?.id ?? null,
    phone,
    provider: META_PROVIDER,
    provider_message_id: message.id,
    body: message.text.body.slice(0, 4096),
    direction: "inbound",
    status: "received",
    action_taken: actionTaken,
  });
}

async function findClientByPhone(
  supabase: ReturnType<typeof createAdminClient>,
  phone: string,
): Promise<{ id: string } | null> {
  const pattern = `%${phone}%`;
  const { data } = await supabase
    .from("clients")
    .select("id")
    .or(`phone.ilike.${pattern},whatsapp.ilike.${pattern}`)
    .limit(1);
  return data?.[0] ?? null;
}

async function findNextActiveAppointment(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string,
): Promise<AppointmentRow | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("client_id", clientId)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(1);
  return data?.[0] ?? null;
}

async function applyIntent(
  supabase: ReturnType<typeof createAdminClient>,
  appointment: AppointmentRow,
  intent: "confirmed" | "cancelled",
  body: string,
): Promise<void> {
  if (intent === "confirmed") {
    if (appointment.status === "pending") {
      await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointment.id);
    }
    return;
  }

  // cancelled
  if (appointment.status === "pending" || appointment.status === "confirmed") {
    const note = `Cancelada por cliente vía WhatsApp: ${body.slice(0, 200)}`;
    const updatedNotes = appointment.notes
      ? `${appointment.notes}\n${note}`
      : note;
    await supabase
      .from("appointments")
      .update({ status: "cancelled", notes: updatedNotes })
      .eq("id", appointment.id);
  }
}

interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  errors?: Array<{ message?: string }>;
}

interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  text: { body: string };
  type: string;
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: WhatsAppStatus[];
        messages?: WhatsAppIncomingMessage[];
      };
    }>;
  }>;
}

function extractStatuses(payload: WhatsAppWebhookPayload): WhatsAppStatus[] {
  const statuses: WhatsAppStatus[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        statuses.push(status);
      }
    }
  }
  return statuses;
}

function extractMessages(
  payload: WhatsAppWebhookPayload,
): WhatsAppIncomingMessage[] {
  const messages: WhatsAppIncomingMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type === "text") {
          messages.push(message);
        }
      }
    }
  }
  return messages;
}

function mapStatus(
  status: WhatsAppStatus["status"],
): WhatsAppMessageStatus | null {
  switch (status) {
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    default:
      return null;
  }
}
