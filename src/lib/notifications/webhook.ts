import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica la firma HMAC SHA256 que Meta envía en el header
 * `X-Hub-Signature-256` de sus webhooks.
 */
export function verifyWhatsAppSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
