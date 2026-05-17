import { log } from "@/lib/utils";
import { inferMediaType } from "../media.helpers";
import type { SendMessageInput, SendMessageResult } from "../types";

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const apiUrl = process.env.META_API_URL;
  const phoneId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_ACCESS_TOKEN;

  if (!apiUrl || !phoneId || !token) {
    log("error", "meta.provider", "Faltan credenciales de Meta Cloud API");
    return { success: false, error: "Credenciales incompletas" };
  }

  try {
    const payload = buildPayload(input);
    const response = await fetch(`${apiUrl}/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.text();
      log("error", "meta.provider", "Error al enviar mensaje", { errData });
      return { success: false, error: "Error al enviar mensaje" };
    }

    log("info", "meta.provider", "Mensaje enviado", { to: input.to, hasMedia: !!input.mediaUrl });
    return { success: true };
  } catch (error) {
    log("error", "meta.provider", "Fallo de conexión", { error: String(error) });
    return { success: false, error: "Fallo de conexión con Meta Cloud API" };
  }
}

function buildPayload(input: SendMessageInput): object {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to: input.to };
  if (input.mediaUrl) {
    const mediaType = input.mediaType ?? inferMediaType(input.mediaUrl);
    return { ...base, type: mediaType, [mediaType]: { link: input.mediaUrl, ...(input.text ? { caption: input.text } : {}) } };
  }
  return { ...base, type: "text", text: { preview_url: false, body: input.text } };
}
