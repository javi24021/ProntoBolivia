import { NextResponse } from "next/server";
import { processIncomingMessage } from "@/services/messageProcessor.service";

/**
 * GET /api/seed
 *
 * Crea 10 conversaciones de prueba con diversidad para validar filtros.
 * Solo para desarrollo/demo. NO debe existir en producción real.
 *
 * Mezcla:
 * - 4 canales (whatsapp, facebook, tiktok, instagram)
 * - 2 tipos de cliente (mayorista, minorista)
 * - 4 categorías (limpieza, belleza, cosméticos, artículos_bebe)
 * - Algunas con escalamiento a humano
 */

interface SeedScenario {
  phone: string;
  name: string;
  channel: "whatsapp" | "facebook" | "tiktok" | "instagram" | "demo";
  messages: string[];
}

const SCENARIOS: SeedScenario[] = [
  {
    phone: "+59171000001",
    name: "María González",
    channel: "whatsapp",
    messages: [
      "Hola, soy María González",
      "Compro al por mayor",
      "Quiero el catálogo de belleza",
    ],
  },
  {
    phone: "+59171000002",
    name: "Carlos Ramírez",
    channel: "facebook",
    messages: [
      "Buenas tardes, mi nombre es Carlos Ramírez",
      "Por mayor",
      "Limpieza por favor",
    ],
  },
  {
    phone: "+59171000003",
    name: "Ana Vargas",
    channel: "instagram",
    messages: [
      "Hola, soy Ana Vargas",
      "Compro por unidad",
      "Cosméticos",
    ],
  },
  {
    phone: "+59171000004",
    name: "Roberto Silva",
    channel: "tiktok",
    messages: [
      "Hola, Roberto Silva",
      "Mayorista",
      "Artículos de bebé al por mayor",
    ],
  },
  {
    phone: "+59171000005",
    name: "Fernando Ruiz",
    channel: "whatsapp",
    messages: [
      "Buenas, Fernando Ruiz",
      "Por mayor",
      "Belleza",
      "Necesito cotización urgente de 500 unidades para mi tienda HOY",
    ],
  },
  {
    phone: "+59171000006",
    name: "Lucía Mendoza",
    channel: "facebook",
    messages: [
      "Hola, soy Lucía",
      "Minorista",
      "Limpieza",
    ],
  },
  {
    phone: "+59171000007",
    name: "Diego Torres",
    channel: "whatsapp",
    messages: [
      "Hola, Diego Torres",
      "Por mayor",
      "Cosméticos",
      "Quiero hacer un pedido de 200 unidades, pago contado",
    ],
  },
  {
    phone: "+59171000008",
    name: "Patricia López",
    channel: "instagram",
    messages: [
      "Hola, Patricia",
      "Minorista",
      "Artículos de bebé",
    ],
  },
];

let isSeeding = false;

export async function GET() {
  if (isSeeding) {
    return NextResponse.json({
      ok: false,
      error: "Ya hay un proceso de sembrado (seed) en ejecución. Espera unos segundos.",
    }, { status: 409 });
  }

  isSeeding = true;

  try {
    const results: Array<{
    name: string;
    phone: string;
    channel: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const scenario of SCENARIOS) {
    let scenarioOk = true;
    let scenarioError: string | undefined;

    for (const msg of scenario.messages) {
      const res = await processIncomingMessage({
        phone: scenario.phone,
        channel: scenario.channel,
        text: msg,
        name: scenario.name,
      });
      if (!res.ok) {
        scenarioOk = false;
        scenarioError = res.error;
        break;
      }
      // Pequeña pausa para evitar saturar OpenAI rate limit
      await new Promise((r) => setTimeout(r, 250));
    }

    results.push({
      name: scenario.name,
      phone: scenario.phone,
      channel: scenario.channel,
      ok: scenarioOk,
      error: scenarioError,
    });
  }

    return NextResponse.json({
      ok: true,
      seeded: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message || "Error desconocido en el sembrado",
    }, { status: 500 });
  } finally {
    isSeeding = false;
  }
}