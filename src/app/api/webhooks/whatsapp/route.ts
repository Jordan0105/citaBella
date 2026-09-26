import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWhatsAppSignature } from "@/lib/notifications/webhook";
import type { WhatsAppMessageStatus } from "@/lib/notifications";

const SIGNATURE_HEADER = "x-hub-signature-256";

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
 * Eventos de Meta (POST): actualizaciones de estado de mensajes.
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
      .eq("provider", "meta");
  }

  return NextResponse.json({ ok: true });
}

interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  errors?: Array<{ message?: string }>;
}

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: WhatsAppStatus[];
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
