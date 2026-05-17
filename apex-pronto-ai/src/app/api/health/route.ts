import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { checkOpenAIHealth } from "@/services/ai.service";

/**
 * GET /api/health
 *
 * Devuelve estado de los servicios externos.
 * Usado por el dashboard para mostrar indicadores de estado.
 */
export async function GET() {
  // Firebase
  let firebaseOk = false;
  let firebaseError: string | undefined;
  const fbStart = Date.now();
  try {
    await db.collection("conversations").limit(1).get();
    firebaseOk = true;
  } catch (error) {
    firebaseError = error instanceof Error ? error.message : String(error);
  }
  const firebaseLatency = Date.now() - fbStart;

  // OpenAI
  const openai = await checkOpenAIHealth();

  const demoFallback = process.env.DEMO_FALLBACK_MODE === "true";

  return NextResponse.json({
    ok: firebaseOk, // Firebase es crítico; OpenAI tiene fallback
    timestamp: new Date().toISOString(),
    demoFallbackMode: demoFallback,
    services: {
      firebase: {
        ok: firebaseOk,
        latencyMs: firebaseLatency,
        error: firebaseError,
      },
      openai: {
        ok: openai.ok,
        latencyMs: openai.latencyMs,
        error: openai.error,
        note: demoFallback
          ? "Modo fallback activo (no se usa OpenAI)"
          : openai.ok
          ? "Operativo"
          : "Caído - se usa motor local de fallback",
      },
    },
  });
}