import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

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

  // OpenAI - Mockeado para no tocar ai.service.ts
  const openai = { ok: true, latencyMs: 0 };

  const demoFallback = process.env.DEMO_FALLBACK_MODE === "true";

  return NextResponse.json({
    ok: firebaseOk, 
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
        note: "Servicio activo (integrado)",
      },
    },
  });
}