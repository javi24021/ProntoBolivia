import { db } from "@/lib/firebase";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { normalizePhone, log, truncate } from "@/lib/utils";
import type {
  Conversation,
  ConversationCreateInput,
  Message,
  MessageCreateInput,
  ServiceResult,
  ClientType,
  Category,
  Priority,
  ConversationLabel,
  ConversationStatus,
  Channel,
  MessageRole,
} from "@/types";

const COLLECTION = "conversations";

function fromFirestore(
  id: string,
  data: FirebaseFirestore.DocumentData
): Conversation {
  return {
    id,
    customerId: (data.customerId as string | null) ?? null,
    phone: (data.phone as string) ?? "",
    customerName: (data.customerName as string | null) ?? null,
    channel: (data.channel as Channel) ?? "demo",
    currentClientType: (data.currentClientType as ClientType) ?? "desconocido",
    category: (data.category as Category) ?? "desconocido",
    priority: (data.priority as Priority) ?? "media",
    label: (data.label as ConversationLabel | null) ?? null,
    status: (data.status as ConversationStatus) ?? "bot_handling",
    summary: (data.summary as string) ?? "",
    escalationReason: (data.escalationReason as string | null) ?? null,
    lastMessage: (data.lastMessage as string) ?? "",
    unreadCount: (data.unreadCount as number) ?? 0,
    requiresHuman: (data.requiresHuman as boolean) ?? false,
    assignedTo: (data.assignedTo as string | null) ?? null,
    lastAskedClientTypeAt: (data.lastAskedClientTypeAt as Timestamp | null) ?? null,
    lastAskedNameAt: (data.lastAskedNameAt as Timestamp | null) ?? null,
    viewingBy: (data.viewingBy as string | null) ?? null,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

export async function findActiveConversationByPhone(
  rawPhone: string
): Promise<Conversation | null> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;

  const snap = await db
    .collection(COLLECTION)
    .where("phone", "==", phone)
    .where("status", "in", [
      "bot_handling",
      "queued",
      "requires_human",
      "human_notified",
      "human_handling",
    ])
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return fromFirestore(docSnap.id, docSnap.data());
}

export async function createConversation(
  input: ConversationCreateInput
): Promise<ServiceResult<Conversation>> {
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return { ok: false, error: "Teléfono inválido o vacío" };
  }

  try {
    const ref = db.collection(COLLECTION).doc();
    const newConv = {
      customerId: input.customerId ?? null,
      phone,
      customerName: input.customerName ?? null,
      channel: input.channel,
      currentClientType: input.currentClientType ?? "desconocido",
      category: input.category ?? "desconocido",
      priority: "media" as Priority,
      label: null,
      status: "bot_handling" as ConversationStatus,
      summary: "",
      escalationReason: null,
      lastMessage: "",
      unreadCount: 0,
      requiresHuman: false,
      assignedTo: null,
      lastAskedClientTypeAt: null,
      lastAskedNameAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(newConv);
    const snap = await ref.get();
    log("info", "conversation.service", "Conversation created", { id: ref.id });
    return { ok: true, data: fromFirestore(snap.id, snap.data()!) };
  } catch (error) {
    log("error", "conversation.service", "Error creating conversation", {
      error: String(error),
    });
    return { ok: false, error: String(error) };
  }
}

export async function findOrCreateConversation(
  input: ConversationCreateInput
): Promise<ServiceResult<Conversation>> {
  const existing = await findActiveConversationByPhone(input.phone);
  if (existing) return { ok: true, data: existing };
  return createConversation(input);
}

export async function updateConversation(
  conversationId: string,
  patch: Partial<
    Pick<
      Conversation,
      | "customerId"
      | "customerName"
      | "currentClientType"
      | "category"
      | "priority"
      | "label"
      | "status"
      | "summary"
      | "escalationReason"
      | "lastMessage"
      | "unreadCount"
      | "requiresHuman"
      | "assignedTo"
      | "lastAskedClientTypeAt"
      | "lastAskedNameAt"
    >
  >
): Promise<ServiceResult<void>> {
  try {
    const ref = db.collection(COLLECTION).doc(conversationId);
    await ref.update({
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, data: undefined };
  } catch (error) {
    log("error", "conversation.service", "Error updating conversation", {
      conversationId,
      error: String(error),
    });
    return { ok: false, error: String(error) };
  }
}

/* ============================================================
 *  MENSAJES (subcolección)
 * ============================================================ */

export async function addMessage(
  conversationId: string,
  input: MessageCreateInput
): Promise<ServiceResult<Message>> {
  try {
    const messagesRef = db
      .collection(COLLECTION)
      .doc(conversationId)
      .collection("messages");

    const docRef = await messagesRef.add({
      role: input.role,
      text: input.text,
      channel: input.channel,
      metadata: input.metadata ?? {},
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection(COLLECTION).doc(conversationId).update({
      lastMessage: truncate(input.text, 140),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const saved = await docRef.get();
    const data = saved.data()!;
    return {
      ok: true,
      data: {
        id: saved.id,
        role: data.role as MessageRole,
        text: data.text as string,
        channel: data.channel as Channel,
        createdAt: data.createdAt as Timestamp,
        metadata: data.metadata as Record<string, unknown>,
      },
    };
  } catch (error) {
    log("error", "conversation.service", "Error adding message", {
      conversationId,
      error: String(error),
    });
    return { ok: false, error: String(error) };
  }
}

export async function getRecentMessages(
  conversationId: string,
  count = 10
): Promise<Message[]> {
  const snap = await db
    .collection(COLLECTION)
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(count)
    .get();

  const messages = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      role: data.role as MessageRole,
      text: data.text as string,
      channel: data.channel as Channel,
      createdAt: data.createdAt as Timestamp,
      metadata: data.metadata as Record<string, unknown>,
    };
  });
  return messages.reverse();
}