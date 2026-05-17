/**
 * Tipos compartidos del módulo de WhatsApp.
 */

export type WhatsAppProvider = "evolution" | "meta" | "n8n" | "none";

export type MediaType = "image" | "document" | "video" | "audio";

export interface SendMessageInput {
  /** Número en formato internacional (ej. 59170000000). */
  to: string;
  text: string;
  mediaUrl?: string | null;
  /** Si se omite y hay mediaUrl, se infiere de la extensión. */
  mediaType?: MediaType;
}

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

export interface HealthCheckResult {
  status: "connected" | "disconnected" | "error";
  /** Mensaje seguro para la UI — sin datos internos del servidor. */
  message: string;
}

export interface QRResult {
  qrBase64: string | null;
  state: "connected" | "qr" | "error";
  message: string;
}

export interface WebhookConfigResult {
  ok: boolean;
  message: string;
}

export interface EvolutionCreds {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}
