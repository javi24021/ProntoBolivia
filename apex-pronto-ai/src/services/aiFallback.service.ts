import type { AIContext, AIResponse, ClientType, Category } from "@/types";

/**
 * Motor de fallback local sin IA.
 *
 * Genera respuestas razonables basadas en reglas cuando OpenAI no responde.
 * No es tan bueno como GPT, pero mantiene la demo viva.
 *
 * Reglas:
 * - Si no hay nombre → preguntarlo
 * - Si no hay tipo de cliente → preguntarlo
 * - Si no hay categoría → preguntarla
 * - Si hay todo → enviar catálogo correspondiente
 * - Detecta palabras clave para clasificar
 */

function detectClientType(text: string, prev: ClientType): ClientType {
  const lower = text.toLowerCase();
  if (
    /\b(mayor|mayorista|por\s+mayor|al\s+por\s+mayor|para\s+(mi\s+)?tienda|revender|grandes\s+cantidades)\b/i.test(
      lower
    )
  ) {
    return "mayorista";
  }
  if (
    /\b(minorista|por\s+unidad|al\s+detalle|para\s+(uso|consumo)\s+personal|una\s+unidad)\b/i.test(
      lower
    )
  ) {
    return "minorista";
  }
  return prev;
}

function detectCategory(text: string, prev: Category | null): Category {
  const lower = text.toLowerCase();
  if (/\b(limpieza|detergente|lavandina|cloro|jab[oó]n|trapeador)\b/i.test(lower)) return "limpieza";
  if (/\b(belleza|shampoo|acondicionador|cabello|tratamiento)\b/i.test(lower)) return "belleza";
  if (/\b(cosm[eé]tico|maquillaje|labial|sombra|polvo|rubor|base)\b/i.test(lower)) return "cosmeticos";
  if (/\b(beb[eé]|pa[ñn]al|biber[oó]n|chupete|bebes|infantil)\b/i.test(lower))
    return "articulos_bebe";
  return prev ?? "desconocido";
}

function detectEscalation(text: string): { escalate: boolean; reason?: string } {
  const lower = text.toLowerCase();
  if (/\b(cotizaci[oó]n|cotizar|precio\s+exacto|cu[aá]nto\s+cuesta)\b/i.test(lower)) {
    return { escalate: true, reason: "Solicita cotización formal" };
  }
  if (/\b(pedido|comprar\s+\d+|\d+\s+unidades|urgente|reclamo|queja)\b/i.test(lower)) {
    return { escalate: true, reason: "Pedido específico o reclamo" };
  }
  if (/\b(pago|pagar|transferencia|qr\b|tarjeta\s+de\s+cr[eé]dito)\b/i.test(lower)) {
    return { escalate: true, reason: "Consulta sobre pago" };
  }
  if (/\b(stock|inventario|disponible|cuantos\s+hay|colores?)\b/i.test(lower)) {
    return { escalate: true, reason: "Consulta sobre stock o variantes" };
  }
  return { escalate: false };
}

/**
 * Genera una AIResponse sin llamar a OpenAI.
 * Es la última línea de defensa cuando la IA falla.
 */
export function generateFallbackResponse(ctx: AIContext): AIResponse {
  const customerName = ctx.customerName;
  const detectedClientType = detectClientType(ctx.userMessage, ctx.knownClientType);
  const detectedCategory = detectCategory(ctx.userMessage, ctx.lastCategory);
  const escalation = detectEscalation(ctx.userMessage);

  // 1. Si pide algo que requiere humano → escalar
  if (escalation.escalate) {
    return {
      reply:
        "Ya registré tu consulta y la derivaré con un asesor para que pueda ayudarte con información específica.",
      clientType: detectedClientType,
      currentClientType: detectedClientType,
      category: detectedCategory,
      priority: "alta",
      label: "importante",
      requiresHuman: true,
      summary: `[Modo fallback] ${escalation.reason ?? "Escalado por contenido"}`,
      escalationReason: escalation.reason,
      intentScore: 75,
      shouldAskName: false,
      shouldAskClientType: false,
      shouldAskCategory: false,
    };
  }

  // 2. Si no tenemos nombre → pedirlo
  if (!customerName) {
    return {
      reply:
        "¡Hola! Gracias por escribir a Pronto Bolivia. ¿Me podrías indicar tu nombre para registrar tu consulta?",
      clientType: detectedClientType,
      currentClientType: detectedClientType,
      category: detectedCategory,
      priority: "media",
      label: "cliente",
      requiresHuman: false,
      summary: "[Fallback] Solicitando nombre del cliente",
      intentScore: 30,
      shouldAskName: true,
      shouldAskClientType: false,
      shouldAskCategory: false,
    };
  }

  // 3. Si no sabemos si mayorista o minorista → preguntarlo
  if (detectedClientType === "desconocido") {
    return {
      reply: `Gracias ${customerName}. ¿Esta vez buscas comprar por mayor o por unidad?`,
      clientType: "desconocido",
      currentClientType: "desconocido",
      category: detectedCategory,
      priority: "media",
      label: "cliente",
      requiresHuman: false,
      summary: "[Fallback] Solicitando tipo de cliente",
      intentScore: 40,
      shouldAskName: false,
      shouldAskClientType: true,
      shouldAskCategory: false,
    };
  }

  // 4. Si no sabemos la categoría → preguntarla
  if (detectedCategory === "desconocido") {
    return {
      reply:
        "Perfecto. ¿Qué categoría te interesa: limpieza, belleza, cosméticos o artículos de bebé?",
      clientType: detectedClientType,
      currentClientType: detectedClientType,
      category: "desconocido",
      priority: "media",
      label: "cliente",
      requiresHuman: false,
      summary: "[Fallback] Solicitando categoría",
      intentScore: 50,
      shouldAskName: false,
      shouldAskClientType: false,
      shouldAskCategory: true,
    };
  }

  // 5. Tenemos todo → enviar catálogo
  const catalogId = `${detectedCategory}_${detectedClientType}`;
  const tipoTexto = detectedClientType === "mayorista" ? "al por mayor" : "al detalle";
  return {
    reply: `Perfecto. Aquí tienes nuestro catálogo de ${detectedCategory.replace("_", " ")} ${tipoTexto}.`,
    clientType: detectedClientType,
    currentClientType: detectedClientType,
    category: detectedCategory,
    priority: "media",
    label: "cliente",
    requiresHuman: false,
    summary: `[Fallback] ${customerName} (${detectedClientType}) busca ${detectedCategory}`,
    intentScore: 65,
    catalogId,
    shouldAskName: false,
    shouldAskClientType: false,
    shouldAskCategory: false,
  };
}