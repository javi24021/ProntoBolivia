import { NextRequest, NextResponse } from "next/server";
import { whatsappService } from "@/services/whatsapp.service";
import { saveProvider, getCurrentProvider } from "@/services/whatsapp/config.service";
import type { WhatsAppProvider } from "@/services/whatsapp/types";

/**
 * GET /api/whatsapp-health?action=...
 *
 *  (sin action)      → Health check + proveedor actual
 *  ?action=getQR     → QR base64 de Evolution
 *  ?action=syncWebhook → Configura webhook en Evolution
 *
 * POST /api/whatsapp-health
 *  Body: { activeProvider: "evolution" | "meta" | "n8n" | "none" }
 *  → Guarda en Firestore system_settings/whatsapp_config
 */

const VALID_PROVIDERS: WhatsAppProvider[] = ["evolution", "meta", "n8n", "none"];

// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  if (action === "getQR") {
    const result = await whatsappService.getConnectionQR();
    return NextResponse.json(
      { ok: result.state !== "error", data: result },
      { status: result.state === "error" ? 500 : 200 }
    );
  }

  if (action === "syncWebhook") {
    // Usar la URL pública del servidor. Para localhost funciona con HTTP.
    const host = process.env.NEXT_PUBLIC_APP_URL
      ?? `${req.nextUrl.protocol}//${req.headers.get("host") ?? "localhost:3000"}`;
    const result = await whatsappService.configureWebhook(host);
    return NextResponse.json({ ok: result.ok, data: result }, { status: result.ok ? 200 : 500 });
  }

  // Health check por defecto — también devuelve el proveedor actual de Firestore
  const [health, currentProvider] = await Promise.all([
    whatsappService.checkHealth(),
    getCurrentProvider(),
  ]);

  return NextResponse.json({
    ok: health.status !== "error",
    data: {
      ...health,
      currentProvider: currentProvider ?? process.env.WHATSAPP_PROVIDER ?? "none",
    },
  }, { status: health.status === "error" ? 500 : 200 });
}

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { activeProvider?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido: se esperaba JSON" }, { status: 400 });
  }

  const provider = body.activeProvider as WhatsAppProvider;
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { ok: false, error: `activeProvider inválido. Válidos: ${VALID_PROVIDERS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await saveProvider(provider);
    return NextResponse.json({ ok: true, data: { activeProvider: provider } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Error al guardar en Firestore" }, { status: 500 });
  }
}
