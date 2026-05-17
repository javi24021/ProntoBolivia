import { log } from "@/lib/utils";
import { inferMediaType } from "../media.helpers";
import type {
  EvolutionCreds,
  HealthCheckResult,
  QRResult,
  SendMessageInput,
  SendMessageResult,
  WebhookConfigResult,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
//  CREDENCIALES
// ─────────────────────────────────────────────────────────────────────────────

export function getEvolutionCreds(): EvolutionCreds | null {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
  if (!apiUrl || !apiKey || !instanceName) return null;
  return { apiUrl, apiKey, instanceName };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENVÍO DE MENSAJES
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const creds = getEvolutionCreds();
  if (!creds) {
    log("error", "evolution.provider", "Faltan credenciales o son placeholder");
    return { success: false, error: "Credenciales incompletas" };
  }

  try {
    const { endpoint, body } = buildSendPayload(input, creds);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.apiKey },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.text();
      log("error", "evolution.provider", "Error al enviar mensaje", { errData });
      return { success: false, error: "Error al enviar mensaje" };
    }

    log("info", "evolution.provider", "Mensaje enviado", { to: input.to, hasMedia: !!input.mediaUrl });
    return { success: true };
  } catch (error) {
    log("error", "evolution.provider", "Fallo de conexión", { error: String(error) });
    return { success: false, error: "Fallo de conexión con Evolution API" };
  }
}

function buildSendPayload(input: SendMessageInput, creds: EvolutionCreds) {
  if (input.mediaUrl) {
    const mediaType = input.mediaType ?? inferMediaType(input.mediaUrl);
    return {
      endpoint: `${creds.apiUrl}/message/sendMedia/${creds.instanceName}`,
      body: {
        number: input.to,
        options: { delay: 1200, presence: "composing" },
        mediaMessage: { mediatype: mediaType, media: input.mediaUrl, caption: input.text || undefined },
      },
    };
  }
  return {
    endpoint: `${creds.apiUrl}/message/sendText/${creds.instanceName}`,
    body: {
      number: input.to,
      options: { delay: 1200, presence: "composing" },
      textMessage: { text: input.text },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  HEALTH CHECK + AUTO-HEALING
// ─────────────────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<HealthCheckResult> {
  const creds = getEvolutionCreds();
  if (!creds) {
    return {
      status: "error",
      message: "Credenciales de Evolution API no configuradas. Edita EVOLUTION_API_URL, EVOLUTION_API_KEY y EVOLUTION_INSTANCE_NAME en .env.local",
    };
  }

  try {
    const response = await fetch(
      `${creds.apiUrl}/instance/connectionState/${creds.instanceName}`,
      { headers: { apikey: creds.apiKey } }
    );

    if (response.status === 404) {
      log("warn", "evolution.provider", "Instancia no encontrada — recreando", { instanceName: creds.instanceName });
      await ensureInstanceExists(creds);
      return { status: "disconnected", message: "Instancia creada. Escanea el QR para conectar." };
    }

    if (!response.ok) {
      log("error", "evolution.provider", "Error HTTP al consultar instancia", { status: response.status });
      return { status: "error", message: `Error HTTP ${response.status} al consultar Evolution API` };
    }

    const data = await response.json();
    if (data?.instance?.state === "open") {
      return { status: "connected", message: "Conectado a WhatsApp" };
    }
    return { status: "disconnected", message: "Esperando escaneo de QR" };
  } catch (error) {
    log("error", "evolution.provider", "Fallo de conexión en checkHealth", { error: String(error) });
    return { status: "error", message: "No se pudo alcanzar Evolution API. Verifica que el servidor esté activo." };
  }
}

async function ensureInstanceExists(creds: EvolutionCreds): Promise<void> {
  try {
    const response = await fetch(`${creds.apiUrl}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.apiKey },
      body: JSON.stringify({ instanceName: creds.instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
    });
    if (response.ok) {
      log("info", "evolution.provider", "Instancia creada automáticamente", { instanceName: creds.instanceName });
    } else {
      log("error", "evolution.provider", "Fallo al crear instancia automáticamente");
    }
  } catch (error) {
    log("error", "evolution.provider", "Fallo fetch ensureInstanceExists", { error: String(error) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  QR CODE
// ─────────────────────────────────────────────────────────────────────────────

export async function getConnectionQR(): Promise<QRResult> {
  const creds = getEvolutionCreds();
  if (!creds) {
    return { qrBase64: null, state: "error", message: "Credenciales no configuradas" };
  }

  try {
    const response = await fetch(
      `${creds.apiUrl}/instance/connect/${creds.instanceName}`,
      { headers: { apikey: creds.apiKey } }
    );

    if (!response.ok) {
      log("error", "evolution.provider", "Error al solicitar QR", { status: response.status });
      return { qrBase64: null, state: "error", message: "Error al solicitar QR" };
    }

    const data = await response.json();

    if (data?.instance?.state === "open" || data?.status === "connected") {
      return { qrBase64: null, state: "connected", message: "Ya conectado" };
    }

    const raw: string | undefined = data?.base64 ?? data?.qr?.base64;
    if (raw) {
      return {
        qrBase64: raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`,
        state: "qr",
        message: "Escanea el código QR con tu WhatsApp",
      };
    }

    return { qrBase64: null, state: "error", message: "Respuesta inesperada de Evolution API" };
  } catch (error) {
    log("error", "evolution.provider", "Fallo fetch getConnectionQR", { error: String(error) });
    return { qrBase64: null, state: "error", message: "No se pudo alcanzar Evolution API" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────

export async function configureWebhook(publicBaseUrl: string): Promise<WebhookConfigResult> {
  const creds = getEvolutionCreds();
  if (!creds) {
    return { ok: false, message: "Credenciales no configuradas" };
  }

  try {
    const response = await fetch(`${creds.apiUrl}/webhook/set/${creds.instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.apiKey },
      body: JSON.stringify({
        url: `${publicBaseUrl}/api/inbound-message`,
        webhook_by_events: false,
        webhook_base64: false,
        events: ["MESSAGES_UPSERT"],
      }),
    });

    if (!response.ok) {
      log("error", "evolution.provider", "Error al configurar webhook");
      return { ok: false, message: "Error al configurar webhook en Evolution API" };
    }

    log("info", "evolution.provider", "Webhook configurado", { url: `${publicBaseUrl}/api/inbound-message` });
    return { ok: true, message: "Webhook configurado correctamente" };
  } catch (error) {
    log("error", "evolution.provider", "Fallo fetch configureWebhook", { error: String(error) });
    return { ok: false, message: "No se pudo alcanzar Evolution API" };
  }
}
