import { NextRequest, NextResponse } from "next/server";
import { processIncomingMessage } from "@/services/messageProcessor.service";
import { log } from "@/lib/utils";
import { CHANNELS, type Channel } from "@/types";

/**
 * POST /api/inbound-message
 *
 * Endpoint para canales externos a través de n8n (WhatsApp, Facebook, TikTok, etc).
 *
 * n8n recibe webhooks de cada canal, normaliza el payload, y lo manda aquí.
 * El procesamiento es exactamente el mismo que /api/chat-demo —
 * la única diferencia es que aquí el `channel` viene del body.
 */

interface InboundBody {
  channel?: unknown;
  phone?: unknown;
  text?: unknown;
  name?: unknown;
}

type ValidationResult =
  | {
      ok: true;
      channel: Channel;
      phone: string;
      text: string;
      name: string | null;
    }
  | { ok: false; error: string };

function isValidChannel(value: unknown): value is Channel {
  return (
    typeof value === "string" && (CHANNELS as readonly string[]).includes(value)
  );
}

function validateBody(body: InboundBody): ValidationResult {
  if (!isValidChannel(body.channel)) {
    return {
      ok: false,
      error: `Campo 'channel' inválido. Valores aceptados: ${CHANNELS.join(", ")}`,
    };
  }
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
  const name =
    typeof body.name === "string" && body.name.trim() !== ""
      ? body.name.trim()
      : null;

  return {
    ok: true,
    channel: body.channel,
    phone: body.phone.trim(),
    text: body.text.trim(),
    name,
  };
}

export async function POST(req: NextRequest) {
  let body: InboundBody;

  try {
    body = (await req.json()) as InboundBody;
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

  log("info", "api/inbound-message", "Mensaje recibido", {
    channel: validation.channel,
    phone: validation.phone,
  });

  const result = await processIncomingMessage({
    channel: validation.channel,
    phone: validation.phone,
    text: validation.text,
    name: validation.name,
  });

  if (!result.ok) {
    log("error", "api/inbound-message", "Processor falló", {
      error: result.error,
    });
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}

/** Solo POST permitido */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Este endpoint solo acepta POST.",
    },
    { status: 405 }
  );
}