import { NextRequest, NextResponse } from "next/server";
import {
  addMessage,
  updateConversation,
  takeOver,
} from "@/services/conversation.service";
import { log } from "@/lib/utils";

/**
 * POST /api/send-as-human
 *
 * Endpoint para que un asesor humano envíe un mensaje al cliente
 * desde el dashboard admin.
 *
 * Efectos:
 *  - Guarda el mensaje en Firestore con role: "human"
 *  - Toma control de la conversación (status: "human_handling")
 *  - Resetea unreadCount
 *  - (FUTURO) Cuando whatsapp.service exista, también enviará al teléfono real
 */

interface SendAsHumanBody {
  conversationId?: unknown;
  text?: unknown;
  operatorName?: unknown;
  channel?: unknown;
}

type ValidationResult =
  | {
      ok: true;
      conversationId: string;
      text: string;
      operatorName: string;
      channel: string;
    }
  | { ok: false; error: string };

function validateBody(body: SendAsHumanBody): ValidationResult {
  if (typeof body.conversationId !== "string" || body.conversationId.trim() === "") {
    return { ok: false, error: "Campo 'conversationId' es requerido" };
  }
  if (typeof body.text !== "string" || body.text.trim() === "") {
    return { ok: false, error: "Campo 'text' es requerido" };
  }
  if (body.text.length > 2000) {
    return { ok: false, error: "Mensaje excede los 2000 caracteres" };
  }
  const operatorName =
    typeof body.operatorName === "string" && body.operatorName.trim() !== ""
      ? body.operatorName.trim()
      : "Asesor";
  const channel =
    typeof body.channel === "string" && body.channel.trim() !== ""
      ? body.channel
      : "demo";

  return {
    ok: true,
    conversationId: body.conversationId.trim(),
    text: body.text.trim(),
    operatorName,
    channel,
  };
}

export async function POST(req: NextRequest) {
  let body: SendAsHumanBody;

  try {
    body = (await req.json()) as SendAsHumanBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body inválido: se esperaba JSON" },
      { status: 400 }
    );
  }

  const validation = validateBody(body);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 }
    );
  }

  try {
    // 1. Tomar control de la conversación
    const takeOverResult = await takeOver(
      validation.conversationId,
      validation.operatorName
    );
    if (!takeOverResult.ok) {
      return NextResponse.json(
        { ok: false, error: takeOverResult.error },
        { status: 500 }
      );
    }

    // 2. Guardar el mensaje del humano
    const msgResult = await addMessage(validation.conversationId, {
      role: "human",
      text: validation.text,
      channel: validation.channel as
        | "demo"
        | "whatsapp"
        | "facebook"
        | "tiktok"
        | "instagram"
        | "other",
      metadata: {
        operatorName: validation.operatorName,
        sentAt: new Date().toISOString(),
      },
    });
    if (!msgResult.ok) {
      return NextResponse.json(
        { ok: false, error: msgResult.error },
        { status: 500 }
      );
    }

    // 3. Resetear unreadCount (el humano ya leyó todo)
    await updateConversation(validation.conversationId, {
      unreadCount: 0,
    });

    // 4. SAFE-HOOK: enviar al WhatsApp real (cuando exista el servicio)
    //    Usamos string variable para evitar verificación en compile-time.
    //    Cuando whatsapp.service.ts exista, este import funcionará automáticamente.
    const whatsappModulePath = "@/services/whatsapp.service";
    (async () => {
      try {
        const mod = await import(/* webpackIgnore: true */ whatsappModulePath);
        if (
          mod &&
          mod.WhatsAppService &&
          typeof mod.WhatsAppService.send === "function"
        ) {
          await mod.WhatsAppService.send({
            conversationId: validation.conversationId,
            text: validation.text,
            metadata: { operatorName: validation.operatorName },
          });
        }
      } catch (err) {
        log("warn", "api/send-as-human", "whatsapp.service no disponible aún", {
          error: String(err),
        });
      }
    })();

    log("info", "api/send-as-human", "Mensaje humano enviado", {
      conversationId: validation.conversationId,
      operatorName: validation.operatorName,
    });

    return NextResponse.json({
      ok: true,
      data: {
        message: msgResult.data,
        conversationId: validation.conversationId,
      },
    });
  } catch (error) {
    log("error", "api/send-as-human", "Error procesando envío humano", {
      error: String(error),
    });
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Este endpoint solo acepta POST." },
    { status: 405 }
  );
}