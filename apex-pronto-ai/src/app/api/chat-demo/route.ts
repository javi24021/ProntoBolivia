import { NextRequest, NextResponse } from "next/server";
import { processIncomingMessage } from "@/services/messageProcessor.service";
import { log } from "@/lib/utils";

/**
 * POST /api/chat-demo
 *
 * Endpoint para el chat demo interno (Fase 10).
 * Recibe un mensaje simulado y lo procesa con el messageProcessor.
 *
 * NO mete lógica de negocio aquí — el cerebro vive en messageProcessor.service.ts.
 */

/** Payload esperado del cliente */
interface ChatDemoBody {
  phone?: unknown;
  text?: unknown;
  name?: unknown;
}

/** Resultado de validación */
type ValidationResult =
  | { ok: true; phone: string; text: string; name: string | null }
  | { ok: false; error: string };

function validateBody(body: ChatDemoBody): ValidationResult {
  if (typeof body.phone !== "string" || body.phone.trim() === "") {
    return {
      ok: false,
      error: "Campo 'phone' es requerido y debe ser string no vacío",
    };
  }
  if (typeof body.text !== "string" || body.text.trim() === "") {
    return {
      ok: false,
      error: "Campo 'text' es requerido y debe ser string no vacío",
    };
  }
  if (body.text.length > 2000) {
    return {
      ok: false,
      error: "Campo 'text' excede el límite de 2000 caracteres",
    };
  }
  // name es opcional
  const name =
    typeof body.name === "string" && body.name.trim() !== ""
      ? body.name.trim()
      : null;

  return {
    ok: true,
    phone: body.phone.trim(),
    text: body.text.trim(),
    name,
  };
}

export async function POST(req: NextRequest) {
  let body: ChatDemoBody;

  try {
    body = (await req.json()) as ChatDemoBody;
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

  const result = await processIncomingMessage({
    phone: validation.phone,
    text: validation.text,
    name: validation.name,
    channel: "demo",
  });

  if (!result.ok) {
    log("error", "api/chat-demo", "Processor falló", { error: result.error });
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}

/**
 * GET /api/chat-demo
 * Solo para verificación rápida desde el navegador. Devuelve 405.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Este endpoint solo acepta POST. Mira la documentación del contrato.",
    },
    { status: 405 }
  );
}