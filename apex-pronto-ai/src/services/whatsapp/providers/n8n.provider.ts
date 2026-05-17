import { log } from "@/lib/utils";
import type { SendMessageInput, SendMessageResult } from "../types";

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    log("error", "n8n.provider", "Falta N8N_WEBHOOK_URL");
    return { success: false, error: "Credenciales incompletas" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: input.to, text: input.text, mediaUrl: input.mediaUrl ?? null }),
    });

    if (!response.ok) {
      const errData = await response.text();
      log("error", "n8n.provider", "Error al enviar", { errData });
      return { success: false, error: "Error al enviar mensaje" };
    }

    log("info", "n8n.provider", "Mensaje enviado", { to: input.to });
    return { success: true };
  } catch (error) {
    log("error", "n8n.provider", "Fallo de conexión", { error: String(error) });
    return { success: false, error: "Fallo de conexión con n8n" };
  }
}
