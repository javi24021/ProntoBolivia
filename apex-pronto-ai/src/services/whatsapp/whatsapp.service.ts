import { log } from "@/lib/utils";
import { resolveProvider } from "./config.service";
import * as evolution from "./providers/evolution.provider";
import * as meta from "./providers/meta.provider";
import * as n8n from "./providers/n8n.provider";
import type {
  HealthCheckResult,
  QRResult,
  SendMessageInput,
  SendMessageResult,
  WebhookConfigResult,
} from "./types";

/**
 * Orquestador central de mensajería.
 * Solo decide qué provider usar — la lógica de integración vive en providers/.
 */
export class WhatsAppService {
  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const provider = await resolveProvider();

    if (provider === "none") {
      log("info", "whatsapp.service", "Modo simulado — mensaje no enviado", { to: input.to });
      return { success: true };
    }

    try {
      switch (provider) {
        case "evolution": return await evolution.sendMessage(input);
        case "meta":      return await meta.sendMessage(input);
        case "n8n":       return await n8n.sendMessage(input);
        default:          return { success: false, error: "Proveedor no soportado" };
      }
    } catch (error) {
      log("error", "whatsapp.service", "Error inesperado", { error: String(error) });
      return { success: false, error: "Error interno" };
    }
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const provider = await resolveProvider();
    switch (provider) {
      case "none":      return { status: "connected", message: "Modo simulado activo" };
      case "meta":      return { status: "connected", message: "Meta Cloud API (sin estado)" };
      case "n8n":       return { status: "connected", message: "n8n Webhook configurado" };
      case "evolution": return evolution.checkHealth();
      default:          return { status: "error", message: "Proveedor desconocido" };
    }
  }

  async getConnectionQR(): Promise<QRResult> {
    return evolution.getConnectionQR();
  }

  async configureWebhook(publicBaseUrl: string): Promise<WebhookConfigResult> {
    return evolution.configureWebhook(publicBaseUrl);
  }
}

/** Singleton compartido por todo el sistema. */
export const whatsappService = new WhatsAppService();
