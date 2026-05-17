import type { FirestoreDate } from "./common";
import type { Category } from "./catalog";

/** Canal de origen del mensaje */
export type Channel =
  | "demo"
  | "whatsapp"
  | "facebook"
  | "tiktok"
  | "instagram"
  | "other";

export const CHANNELS = [
  "demo",
  "whatsapp",
  "facebook",
  "tiktok",
  "instagram",
  "other",
] as const;

/** Tipo de cliente. "desconocido" = aún no clasificado */
export type ClientType = "mayorista" | "minorista" | "desconocido";

export const CLIENT_TYPES = ["mayorista", "minorista", "desconocido"] as const;

/** Estados del ciclo de vida de una conversación */
export type ConversationStatus =
  | "bot_handling"
  | "queued"
  | "requires_human"
  | "human_notified"
  | "human_handling"
  | "completed"
  | "blocked";

export const CONVERSATION_STATUSES = [
  "bot_handling",
  "queued",
  "requires_human",
  "human_notified",
  "human_handling",
  "completed",
  "blocked",
] as const;

/** Prioridad de atención */
export type Priority = "alta" | "media" | "baja" | "bloqueado";

export const PRIORITIES = ["alta", "media", "baja", "bloqueado"] as const;

/** Etiquetas operativas */
export type ConversationLabel =
  | "cotizacion"
  | "importante"
  | "cliente"
  | "pedido_pendiente"
  | "no_responder";

export const CONVERSATION_LABELS = [
  "cotizacion",
  "importante",
  "cliente",
  "pedido_pendiente",
  "no_responder",
] as const;

/**
 * Conversación = sesión actual de un cliente.
 * El `currentClientType` es el tipo DE ESTA conversación,
 * no del cliente para siempre.
 */
export interface Conversation {
  id: string;

  /** Puede ser null al primer mensaje, antes de resolver/crear el customer */
  customerId: string | null;
  phone: string;
  customerName: string | null;

  channel: Channel;

  /** Tipo de cliente en ESTA conversación */
  currentClientType: ClientType;

  category: Category;
  priority: Priority;
  label: ConversationLabel | null;
  status: ConversationStatus;

  /** Resumen corto generado por la IA */
  summary: string;
  /** Motivo de escalamiento a humano, si aplica */
  escalationReason: string | null;

  /** Último mensaje recibido (texto plano, para la lista del dashboard) */
  lastMessage: string;
  /** Mensajes no leídos por el asesor humano */
  unreadCount: number;

  requiresHuman: boolean;
  /** ID del asesor humano asignado, si lo hay */
  assignedTo: string | null;

  /** Marcas para evitar repreguntar lo mismo en bucle */
  lastAskedClientTypeAt: FirestoreDate | null;
  lastAskedNameAt: FirestoreDate | null;

  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

/** Payload para crear una conversación nueva */
export type ConversationCreateInput = Pick<Conversation, "phone" | "channel"> &
  Partial<
    Pick<
      Conversation,
      "customerId" | "customerName" | "currentClientType" | "category"
    >
  >;