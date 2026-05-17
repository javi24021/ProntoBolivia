import type { Category } from "./catalog";
import type {
  ClientType,
  ConversationLabel,
  Priority,
} from "./conversation";

/**
 * CONTRATO OBLIGATORIO de respuesta de la IA.
 *
 * Cualquier cambio aquí debe reflejarse SIMULTÁNEAMENTE en:
 *  - el system prompt de ai.service.ts
 *  - los validadores
 *  - el messageProcessor
 *
 * Es la única superficie por la que el LLM se comunica con el sistema.
 */
export interface AIResponse {
  /** Texto que se le mostrará al cliente. Si requiresHuman=true,
   *  debe ser el mensaje predeterminado de derivación. */
  reply: string;

  /** Tipo "histórico" sugerido para actualizar el perfil del cliente */
  clientType: ClientType;
  /** Tipo de cliente en esta conversación (manda este sobre clientType) */
  currentClientType: ClientType;

  category: Category;
  priority: Priority;
  label: ConversationLabel | null;

  requiresHuman: boolean;
  summary: string;
  escalationReason?: string;

  /** 0-100, qué tan probable es que vaya a comprar */
  intentScore: number;

  /** Si la IA decide enviar un catálogo, su id */
  catalogId?: string;

  /** Banderas de "qué debería hacer el bot a continuación" */
  shouldAskName: boolean;
  shouldAskClientType: boolean;
  shouldAskCategory: boolean;

  /** Si el cliente dice su nombre (incluso mezclado en un texto largo), extráelo aquí */
  extractedName?: string | null;
}

/** Contexto que se le pasa al servicio de IA para decidir */
export interface AIContext {
  customerName: string | null;
  phone: string;
  channel: string;
  knownClientType: ClientType;
  lastCategory: Category | null;
  conversationSummary: string;
  /** Últimos mensajes (rol + texto), del más antiguo al más nuevo */
  history: Array<{ role: "user" | "assistant" | "human"; text: string }>;
  /** Mensaje actual del usuario */
  userMessage: string;
}