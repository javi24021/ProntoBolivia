/**
 * Barrel de re-exportación del módulo de WhatsApp.
 * Mantiene compatibilidad con todos los imports existentes que usen:
 *   import { whatsappService } from "@/services/whatsapp.service"
 *
 * La lógica real vive en src/services/whatsapp/:
 *   types.ts           → Tipos e interfaces
 *   media.helpers.ts   → inferMediaType()
 *   config.service.ts  → resolveProvider() / saveProvider()
 *   providers/         → evolution, meta, n8n
 *   whatsapp.service.ts → Orquestador
 */
export { WhatsAppService, whatsappService } from "./whatsapp/whatsapp.service";
export type {
  WhatsAppProvider,
  SendMessageInput,
  SendMessageResult,
  HealthCheckResult,
  QRResult,
  WebhookConfigResult,
} from "./whatsapp/types";
