import type { FirestoreDate } from "./common";
import type { Channel } from "./conversation";

/** Rol del autor del mensaje */
export type MessageRole = "user" | "assistant" | "human" | "system";

export const MESSAGE_ROLES = ["user", "assistant", "human", "system"] as const;

/**
 * Mensaje individual dentro de una conversación.
 * Subcolección: conversations/{conversationId}/messages/{messageId}
 */
export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  channel: Channel;
  createdAt: FirestoreDate;

  /** Metadata libre: aiRaw, intentScore, escalationReason, etc. */
  metadata?: Record<string, unknown>;
}

/** Payload para crear un mensaje nuevo */
export type MessageCreateInput = Pick<Message, "role" | "text" | "channel"> &
  Pick<Partial<Message>, "metadata">;