import { getOpenAI, getAIModel } from "@/lib/openai";
import { log, safeJsonParse } from "@/lib/utils";
import { generateFallbackResponse } from "./aiFallback.service";
import type { AIContext, AIResponse } from "@/types";

/**
 * System prompt que define el contrato y comportamiento del bot.
 *
 * IMPORTANTE: si cambia el AIResponse en types/ai.ts, ESTE PROMPT
 * debe actualizarse al mismo tiempo. No están sincronizados automáticamente.
 */
const SYSTEM_PROMPT = `Eres el asistente virtual de Pronto Bolivia, distribuidora de productos de limpieza, belleza, cosméticos y artículos de bebé.

TU MISIÓN:
- Atender el primer contacto del cliente.
- Identificar si compra mayorista o minorista (puede cambiar entre conversaciones).
- Identificar categoría de interés.
- Enviar catálogo correcto cuando corresponda.
- Responder preguntas simples y orientativas.
- ESCALAR A HUMANO cuando se requiera información precisa.

CATEGORÍAS VÁLIDAS:
limpieza, belleza, cosmeticos, articulos_bebe, desconocido

TIPOS DE CLIENTE:
mayorista, minorista, desconocido

DEBES ESCALAR A HUMANO (requiresHuman: true) cuando:
- Pidan precio exacto, cotización formal o descuento.
- Pidan stock exacto, colores específicos o variantes.
- Quieran confirmar pago, hacer reclamo o pedido urgente.
- La intención de compra sea muy alta.
- No tengas información suficiente.
- Sea un cliente mayorista importante.

DETECCIÓN DE TIPO DE CLIENTE (currentClientType) - IMPORTANTE:
Cuando el cliente dice CUALQUIERA de estas expresiones, marca currentClientType="mayorista":
- "por mayor", "al por mayor", "mayorista", "compro por mayor", "soy mayorista"
- "venta al por mayor", "compras grandes", "para mi tienda", "para revender"
- Cualquier mención de cantidades grandes (50+, 100+, 200+, etc.)

Cuando el cliente dice CUALQUIERA de estas expresiones, marca currentClientType="minorista":
- "por unidad", "al detalle", "minorista", "para uso personal", "una unidad", "pocas unidades"

NO marques "desconocido" si tienes pistas claras.

ETIQUETAS (label) - SIEMPRE asigna una, nunca dejes null si la conversación tiene contenido:
- "importante" → cuando requiresHuman=true, o cuando el cliente muestra alta intención de compra
- "cotizacion" → cuando pide cotización específica con precios o cantidades
- "cliente" → cuando es un cliente identificado normal sin urgencia
- "pedido_pendiente" → cuando expresamente dice "quiero hacer un pedido"
- "no_responder" → solo si el cliente pide explícitamente no ser contactado

NO DEBES INVENTAR:
- Precios, stock, colores, descuentos, tiempos de entrega ni confirmaciones.

CUANDO ESCALES A HUMANO el "reply" DEBE SER EXACTAMENTE:
"Ya registré tu consulta y la derivaré con un asesor para que pueda ayudarte con información específica."

FORMATO OBLIGATORIO DE RESPUESTA:
Devuelve SOLO un JSON válido (sin markdown, sin \`\`\`json) con esta forma exacta:

{
  "reply": "string",
  "clientType": "mayorista | minorista | desconocido",
  "currentClientType": "mayorista | minorista | desconocido",
  "category": "limpieza | belleza | cosmeticos | articulos_bebe | desconocido",
  "priority": "alta | media | baja | bloqueado",
  "label": "cotizacion | importante | cliente | pedido_pendiente | no_responder | null",
  "requiresHuman": true | false,
  "summary": "resumen corto en 1 oración",
  "escalationReason": "opcional",
  "intentScore": 0-100,
  "catalogId": "opcional, formato categoria_tipo (ej. limpieza_mayorista)",
  "shouldAskName": true | false,
  "shouldAskClientType": true | false,
  "shouldAskCategory": true | false
}

REGLAS DE FLUJO:
- Si no conoces el nombre del cliente, pon shouldAskName=true y pregunta: "¡Hola! Gracias por escribir a Pronto Bolivia. ¿Me podrías indicar tu nombre para registrar tu consulta?"
- Si no conoces el tipo de cliente, pon shouldAskClientType=true y pregunta: "¿Esta vez buscas comprar por mayor o por unidad?"
- Si no conoces la categoría, pon shouldAskCategory=true y pregunta: "¿Qué categoría te interesa: limpieza, belleza, cosméticos o artículos de bebé?"
- Cuando tengas categoría + tipo de cliente, envía el catálogo (catalogId formato "{categoria}_{tipo}").
- NUNCA preguntes lo que ya sabes del contexto.`;

/** Configuración de resiliencia */
const TIMEOUT_MS = 15_000; // 15 segundos
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

/**
 * Modo demo forzado: si DEMO_FALLBACK_MODE=true en env, NO llamamos a OpenAI.
 * Útil para presentar sin internet o sin saldo.
 */
function isDemoFallbackMode(): boolean {
  return process.env.DEMO_FALLBACK_MODE === "true";
}

function buildMessages(ctx: AIContext): Array<{
  role: "system" | "user" | "assistant";
  content: string;
}> {
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: SYSTEM_PROMPT }];

  const contextNote = [
    `Contexto actual:`,
    `- Nombre del cliente: ${ctx.customerName ?? "(desconocido)"}`,
    `- Teléfono: ${ctx.phone}`,
    `- Canal: ${ctx.channel}`,
    `- Tipo de cliente conocido: ${ctx.knownClientType}`,
    `- Última categoría comprada: ${ctx.lastCategory ?? "(ninguna)"}`,
    `- Resumen previo: ${ctx.conversationSummary || "(sin resumen)"}`,
  ].join("\n");
  messages.push({ role: "system", content: contextNote });

  for (const m of ctx.history) {
    const role = m.role === "assistant" ? "assistant" : "user";
    messages.push({ role, content: m.text });
  }

  messages.push({ role: "user", content: ctx.userMessage });
  return messages;
}

function isValidAIResponse(obj: unknown): obj is AIResponse {
  if (!obj || typeof obj !== "object") return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.reply === "string" &&
    typeof r.requiresHuman === "boolean" &&
    typeof r.summary === "string" &&
    typeof r.intentScore === "number"
  );
}

/** Promise.race contra timeout para no colgar la UI eternamente */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} excedió ${ms}ms`)), ms)
    ),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Llama a OpenAI con timeout, reintentos y caída a fallback local.
 *
 * Garantía: SIEMPRE devuelve un AIResponse válido. Nunca lanza excepción.
 * La demo nunca se queda esperando ni se rompe.
 */
export async function generateAIResponse(ctx: AIContext): Promise<AIResponse> {
  // Modo demo forzado: usar siempre el fallback local
  if (isDemoFallbackMode()) {
    log("info", "ai.service", "DEMO_FALLBACK_MODE activo, usando motor local");
    return generateFallbackResponse(ctx);
  }

  const messages = buildMessages(ctx);
  let lastError: string | null = null;

  // Reintentos con backoff
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const client = getOpenAI();
      const model = getAIModel();

      const completion = await withTimeout(
        client.chat.completions.create({
          model,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.4,
        }),
        TIMEOUT_MS,
        `OpenAI (intento ${attempt})`
      );

      const raw = completion.choices[0]?.message?.content ?? "";
      const parsed = safeJsonParse<unknown>(raw);

      if (!isValidAIResponse(parsed)) {
        log("warn", "ai.service", "IA devolvió JSON inválido", {
          attempt,
          raw: raw.slice(0, 200),
        });
        lastError = "Respuesta inválida del modelo";
        if (attempt <= MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        break;
      }

      log("info", "ai.service", "AI response OK", {
        attempt,
        requiresHuman: parsed.requiresHuman,
        category: parsed.category,
      });
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      log("warn", "ai.service", "Error en llamada a OpenAI", {
        attempt,
        error: lastError,
      });
      if (attempt <= MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
    }
  }

  // Caída a fallback local
  log("error", "ai.service", "OpenAI falló todos los intentos, usando fallback local", {
    lastError,
  });
  const fallback = generateFallbackResponse(ctx);
  return {
    ...fallback,
    summary: `${fallback.summary} [IA caída: ${lastError ?? "desconocido"}]`,
  };
}

/**
 * Healthcheck: verifica si OpenAI responde.
 * Usado por el endpoint /api/health.
 */
export async function checkOpenAIHealth(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (isDemoFallbackMode()) {
    return { ok: false, error: "DEMO_FALLBACK_MODE activo" };
  }
  const start = Date.now();
  try {
    const client = getOpenAI();
    await withTimeout(
      client.chat.completions.create({
        model: getAIModel(),
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
      5000,
      "health check"
    );
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}