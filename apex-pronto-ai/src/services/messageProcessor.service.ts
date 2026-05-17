import {
  findOrCreateCustomer,
  updateCustomer,
} from "@/services/customer.service";
import {
  findOrCreateConversation,
  updateConversation,
  addMessage,
  getRecentMessages,
} from "@/services/conversation.service";
import { generateAIResponse } from "@/services/ai.service";
import { findCatalogById } from "@/services/catalog.service";
import { log, truncate, minutesSince } from "@/lib/utils";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  AIResponse,
  Channel,
  Conversation,
  Customer,
  Priority,
  ServiceResult,
} from "@/types";

/* ============================================================
 *  INPUT / OUTPUT
 * ============================================================ */

export interface ProcessMessageInput {
  phone: string;
  channel: Channel;
  text: string;
  /** Nombre proveÃ­do por el caller (opcional). Si el caller lo conoce, mejor */
  name?: string | null;
}

export interface ProcessMessageOutput {
  conversationId: string;
  customerId: string;
  customerName: string | null;
  reply: string;
  requiresHuman: boolean;
  status: Conversation["status"];
  catalogUrl: string | null;
  aiResponse: AIResponse;
}

/* ============================================================
 *  HELPERS DE REGLAS DE NEGOCIO
 * ============================================================ */

const RE_ASK_CLIENT_TYPE_AFTER_MINUTES = 60;

/** Convierte intentScore en prioridad */
function priorityFromIntent(score: number, blocked: boolean): Priority {
  if (blocked) return "bloqueado";
  if (score >= 70) return "alta";
  if (score >= 40) return "media";
  return "baja";
}

/**
 * Decide si hay que repreguntar el tipo de cliente, basado en
 * la Ãºltima vez que se preguntÃ³ en ESTA conversaciÃ³n.
 */
function shouldRepromptClientType(conv: Conversation): boolean {
  if (conv.currentClientType !== "desconocido") return false;
  const last = conv.lastAskedClientTypeAt;
  if (!last) return true;
  const lastDate =
    last instanceof Timestamp ? last.toDate() : (last as Date | null);
  return minutesSince(lastDate) >= RE_ASK_CLIENT_TYPE_AFTER_MINUTES;
}

/**
 * Detecta heurÃ­sticamente si el texto contiene un nombre cuando estamos
 * en modo "esperando nombre". Es una regla simple: si el mensaje es corto
 * (1-4 palabras) y no es una pregunta, asumimos que es el nombre.
 *
 * Esto NO reemplaza a la IA; la IA decide si pedirlo, esto solo lo extrae.
 */
/**
 * Extrae el nombre del cliente de un mensaje, manejando los patrones
 * comunes en espaÃ±ol: "Mi nombre es X", "Soy X", "Me llamo X", o solo "X".
 *
 * Devuelve null si no detecta un nombre vÃ¡lido.
 */
/**
 * Extrae el nombre del cliente de un mensaje, manejando los patrones
 * comunes en espaÃ±ol: "Mi nombre es X", "Soy X", "Me llamo X", o solo "X".
 *
 * Tolerante a typos comunes ("npmbre", "nonbre", etc).
 * Devuelve null si no detecta un nombre vÃ¡lido.
 */
function extractNameFromMessage(text: string): string | null {
  const cleaned = text.trim();
  if (!cleaned) return null;
  if (cleaned.includes("?") || cleaned.includes("Â¿")) return null;
  if (cleaned.length > 80) return null;

  // Patrones con tolerancia a typos: "mi <palabra-similar-a-nombre> es X"
  // Aceptamos cualquier palabra de 5-7 letras donde "es X" o "es: X" venga despuÃ©s.
  const lowered = cleaned.toLowerCase();

  // Variantes con "mi nombre/npmbre/nonbre/nomvre es X"
  const m1 = lowered.match(/^(?:hola[,\s]+)?mi\s+\S{4,8}\s+es[:\s]+(.+)$/i);
  if (m1 && m1[1]) {
    const candidate = m1[1].trim();
    if (isValidNameCandidate(candidate)) {
      return capitalizeName(candidate);
    }
  }

  // "me llamo X" o "me yamo X"
  const m2 = lowered.match(/^(?:hola[,\s]+)?me\s+\S{4,6}\s+(.+)$/i);
  if (m2 && m2[1]) {
    const candidate = m2[1].trim();
    if (isValidNameCandidate(candidate)) {
      return capitalizeName(candidate);
    }
  }

  // "soy X" o "hola soy X"
  const m3 = lowered.match(/^(?:hola[,\s]+|buenas[,\s]+\S*[,\s]+)?soy\s+(.+)$/i);
  if (m3 && m3[1]) {
    const candidate = m3[1].trim();
    if (isValidNameCandidate(candidate)) {
      return capitalizeName(candidate);
    }
  }

  // Fallback: si el mensaje es muy corto (1-3 palabras de puras letras), es el nombre directo
  const words = cleaned.split(/\s+/);
  if (words.length >= 1 && words.length <= 3) {
    const allLetters = words.every((w) => /^[a-zÃ¡Ã©Ã­Ã³ÃºÃ±]+$/i.test(w));
    if (allLetters && isValidNameCandidate(cleaned)) {
      return capitalizeName(cleaned);
    }
  }

  return null;
}

/** Valida que un candidato a nombre sea razonable (no "hola", "si", "no", etc.) */
function isValidNameCandidate(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  // Solo letras y espacios
  if (!/^[a-zÃ¡Ã©Ã­Ã³ÃºÃ±\s]+$/i.test(trimmed)) return false;
  // Rechazar palabras comunes que no son nombres
  const blacklist = [
    "hola",
    "si",
    "no",
    "ok",
    "bien",
    "buenas",
    "buenos",
    "gracias",
    "mayor",
    "menor",
    "mayorista",
    "minorista",
    "limpieza",
    "belleza",
    "cosmeticos",
    "cosmÃ©ticos",
    "bebe",
    "bebÃ©",
  ];
  const lower = trimmed.toLowerCase();
  if (blacklist.includes(lower)) return false;
  return true;
}

/** Capitaliza cada palabra del nombre */
function capitalizeName(raw: string): string {
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/* ============================================================
 *  PROCESADOR PRINCIPAL
 * ============================================================ */

/**
 * Procesa un mensaje entrante de cualquier canal.
 *
 * Es el ÃšNICO punto de entrada para mensajes en el sistema.
 * /api/chat-demo y /api/inbound-message deben usar esta funciÃ³n,
 * sin duplicar lÃ³gica.
 */
export async function processIncomingMessage(
  input: ProcessMessageInput
): Promise<ServiceResult<ProcessMessageOutput>> {
  try {
    /* ------------------------------------------------------------
     * 1. Customer: encontrar o crear
     * ---------------------------------------------------------- */
    const customerResult = await findOrCreateCustomer(input.phone, input.name);
    if (!customerResult.ok) return customerResult;
    let customer = customerResult.data;

    // Si estÃ¡ bloqueado, no procesamos nada mÃ¡s
    if (customer.blocked) {
      return {
        ok: true,
        data: {
          conversationId: "",
          customerId: customer.id,
          customerName: customer.name,
          reply: "",
          requiresHuman: false,
          status: "blocked",
          catalogUrl: null,
          aiResponse: buildBlockedAIResponse(),
        },
      };
    }

    /* ------------------------------------------------------------
     * 2. Conversation: encontrar activa o crear nueva
     * ---------------------------------------------------------- */
    const convResult = await findOrCreateConversation({
      phone: input.phone,
      channel: input.channel,
      customerId: customer.id,
      customerName: customer.name,
    });
    if (!convResult.ok) return convResult;
    let conversation = convResult.data;

    // Si la conversaciÃ³n se creÃ³ sin customerId/Name (por alguna razÃ³n), corregir
    if (!conversation.customerId || conversation.customerName !== customer.name) {
      await updateConversation(conversation.id, {
        customerId: customer.id,
        customerName: customer.name,
      });
      conversation = {
        ...conversation,
        customerId: customer.id,
        customerName: customer.name,
      };
    }

    /* ------------------------------------------------------------
     * 3. Si estÃ¡bamos esperando nombre y este mensaje parece serlo,
     *    capturarlo ANTES de mandarlo a la IA.
     * ---------------------------------------------------------- */
    if (!customer.name && conversation.lastAskedNameAt) {
      const extracted = extractNameFromMessage(input.text);
      if (extracted) {
        await updateCustomer(customer.id, { name: extracted });
        customer = { ...customer, name: extracted };
        await updateConversation(conversation.id, { customerName: extracted });
        conversation = { ...conversation, customerName: extracted };
        log("info", "messageProcessor", "Nombre capturado", {
          customerId: customer.id,
          name: extracted,
        });
      }
    }

    /* ------------------------------------------------------------
     * 4. Guardar el mensaje del usuario
     * ---------------------------------------------------------- */
    const userMsgResult = await addMessage(conversation.id, {
      role: "user",
      text: input.text,
      channel: input.channel,
    });
    if (!userMsgResult.ok) return userMsgResult;

    /* ------------------------------------------------------------
     * 5. Â¿La conversaciÃ³n YA estÃ¡ en requires_human?
     *    Si sÃ­, no volver a llamar a la IA con el mensaje completo.
     *    Solo actualizar unreadCount, summary y NO responder.
     * ---------------------------------------------------------- */
    /* ------------------------------------------------------------
     * 5. Si la conversaciÃ³n ya estÃ¡ atendida por humano,
     *    NO llamar al bot. Solo guardar mensaje + sumar unreadCount.
     * ---------------------------------------------------------- */
    if (
      conversation.status === "requires_human" ||
      conversation.status === "human_handling" ||
      conversation.status === "human_notified"
    ) {
      await updateConversation(conversation.id, {
        unreadCount: conversation.unreadCount + 1,
        summary: truncate(
          `${conversation.summary} | Cliente sigue escribiendo: "${truncate(input.text, 60)}"`,
          500
        ),
      });
      return {
        ok: true,
        data: {
          conversationId: conversation.id,
          customerId: customer.id,
          customerName: customer.name,
          reply: "", // no respondemos nada â€” humano debe atender
          requiresHuman: true,
          status: conversation.status,
          catalogUrl: null,
          aiResponse: buildSilentAIResponse(conversation.status),
        },
      };
    }

    /* ------------------------------------------------------------
     * 6. Construir contexto para la IA
     * ---------------------------------------------------------- */
    const recentMessages = await getRecentMessages(conversation.id, 10);
    const history = recentMessages
      .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "human")
      .slice(0, -1) // excluir el mensaje reciÃ©n agregado
      .map((m) => ({
        role: m.role as "user" | "assistant" | "human",
        text: m.text,
      }));

    /* ------------------------------------------------------------
     * 7. Llamar a la IA
     * ---------------------------------------------------------- */
    const ai = await generateAIResponse({
      customerName: customer.name,
      phone: customer.phone,
      channel: input.channel,
      knownClientType: conversation.currentClientType,
      lastCategory: customer.lastCategory,
      conversationSummary: conversation.summary,
      history,
      userMessage: input.text,
    });

    /* ------------------------------------------------------------
     * 8. Aplicar reglas sobre la respuesta de la IA
     * ---------------------------------------------------------- */

    // CatÃ¡logo: validar contra fuente de verdad
    let catalogUrl: string | null = null;
    let finalReply = ai.reply;

    if (ai.catalogId) {
      const catalog = findCatalogById(ai.catalogId);
      if (catalog) {
        catalogUrl = catalog.url;
        // Anexar URL del catÃ¡logo al reply, si no estÃ¡ ya
        if (!finalReply.includes(catalog.url)) {
          finalReply = `${finalReply}\n\nðŸ“Ž CatÃ¡logo: ${catalog.url}`;
        }
      } else {
        // La IA inventÃ³ un catalogId que no existe â†’ escalar a humano
        log("warn", "messageProcessor", "IA refiriÃ³ catalogId inexistente", {
          catalogId: ai.catalogId,
        });
        ai.requiresHuman = true;
        ai.escalationReason =
          (ai.escalationReason ?? "") +
          " (CatÃ¡logo solicitado no existe en sistema)";
        finalReply =
          "Ya registrÃ© tu consulta y la derivarÃ© con un asesor para que pueda ayudarte con informaciÃ³n especÃ­fica.";
      }
    }

    // Forzar repregunta de clientType si toca, aunque la IA no lo haya hecho
    const shouldForceClientTypeAsk = shouldRepromptClientType(conversation);

    /* ------------------------------------------------------------
     * 9. Guardar respuesta del bot
     * ---------------------------------------------------------- */
    await addMessage(conversation.id, {
      role: "assistant",
      text: finalReply,
      channel: input.channel,
      metadata: {
        intentScore: ai.intentScore,
        category: ai.category,
        currentClientType: ai.currentClientType,
        catalogId: ai.catalogId ?? null,
      },
    });

    /* ------------------------------------------------------------
     * 10. Actualizar customer si la IA detectÃ³ datos nuevos
     * ---------------------------------------------------------- */
    const customerPatch: Parameters<typeof updateCustomer>[1] = {};
    if (ai.currentClientType !== "desconocido") {
      customerPatch.lastClientType = ai.currentClientType;
    }
    if (ai.category !== "desconocido") {
      customerPatch.lastCategory = ai.category;
      // Agregar a favoritos si no estaba
      if (!customer.favoriteCategories.includes(ai.category)) {
        customerPatch.favoriteCategories = [
          ...customer.favoriteCategories,
          ai.category,
        ];
      }
    }
    if (ai.catalogId) {
      customerPatch.lastCatalogSent = ai.catalogId;
    }
    if (Object.keys(customerPatch).length > 0) {
      await updateCustomer(customer.id, customerPatch);
    }

    /* ------------------------------------------------------------
     * 11. Actualizar conversaciÃ³n
     * ---------------------------------------------------------- */
    const priority = priorityFromIntent(ai.intentScore, customer.blocked);
    const newStatus: Conversation["status"] = ai.requiresHuman
      ? "requires_human"
      : conversation.status;

    await updateConversation(conversation.id, {
      currentClientType: ai.currentClientType,
      category: ai.category,
      priority,
      // Si la IA escala a humano pero no asignÃ³ label, forzamos "importante"
label: ai.requiresHuman && !ai.label ? "importante" : ai.label,
      status: newStatus,
      summary: truncate(ai.summary, 400),
      escalationReason: ai.requiresHuman ? ai.escalationReason ?? null : null,
      requiresHuman: ai.requiresHuman,
      unreadCount: ai.requiresHuman ? conversation.unreadCount + 1 : 0,
      lastAskedClientTypeAt:
        ai.shouldAskClientType || shouldForceClientTypeAsk
          ? (FieldValue.serverTimestamp() as unknown as Timestamp)
          : conversation.lastAskedClientTypeAt,
      lastAskedNameAt: ai.shouldAskName
        ? (FieldValue.serverTimestamp() as unknown as Timestamp)
        : conversation.lastAskedNameAt,
    });

    /* ------------------------------------------------------------
     * 12. Devolver resultado al caller
     * ---------------------------------------------------------- */
    log("info", "messageProcessor", "Mensaje procesado", {
      conversationId: conversation.id,
      requiresHuman: ai.requiresHuman,
      status: newStatus,
    });

    return {
      ok: true,
      data: {
        conversationId: conversation.id,
        customerId: customer.id,
        customerName: customer.name,
        reply: finalReply,
        requiresHuman: ai.requiresHuman,
        status: newStatus,
        catalogUrl,
        aiResponse: { ...ai, reply: finalReply },
      },
    };
  } catch (error) {
    log("error", "messageProcessor", "Error procesando mensaje", {
      error: String(error),
    });
    return { ok: false, error: String(error) };
  }
}

/* ============================================================
 *  RESPUESTAS DE FALLBACK
 * ============================================================ */

function buildBlockedAIResponse(): AIResponse {
  return {
    reply: "",
    clientType: "desconocido",
    currentClientType: "desconocido",
    category: "desconocido",
    priority: "bloqueado",
    label: "no_responder",
    requiresHuman: false,
    summary: "Cliente bloqueado, no se procesa",
    intentScore: 0,
    shouldAskName: false,
    shouldAskClientType: false,
    shouldAskCategory: false,
  };
}

function buildSilentAIResponse(
  status: Conversation["status"]
): AIResponse {
  return {
    reply: "",
    clientType: "desconocido",
    currentClientType: "desconocido",
    category: "desconocido",
    priority: "alta",
    label: "importante",
    requiresHuman: true,
    summary: `ConversaciÃ³n ya en estado ${status}, cliente sigue escribiendo`,
    intentScore: 50,
    shouldAskName: false,
    shouldAskClientType: false,
    shouldAskCategory: false,
  };
}