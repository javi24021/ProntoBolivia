import { NextResponse } from "next/server";
import { processIncomingMessage } from "@/services/messageProcessor.service";

export async function GET() {
  // Simula un flujo de 3 mensajes consecutivos del mismo cliente
  const phone = "+59170000099";

  const m1 = await processIncomingMessage({
    phone,
    channel: "demo",
    text: "Hola, buenas tardes",
  });

  const m2 = await processIncomingMessage({
    phone,
    channel: "demo",
    text: "Maria Lopez",
  });

  const m3 = await processIncomingMessage({
  phone,
  channel: "demo",
  text: "Necesito una cotización exacta por 200 cajas de detergente",
});
const m4 = await processIncomingMessage({
  phone,
  channel: "demo",
  text: "Por favor avisen pronto, es urgente",
});

  return NextResponse.json({
    step1: m1.ok ? { reply: m1.data.reply, status: m1.data.status } : m1,
    step2: m2.ok ? { reply: m2.data.reply, status: m2.data.status } : m2,
    step3: m3.ok
      ? {
          reply: m3.data.reply,
          status: m3.data.status,
          catalogUrl: m3.data.catalogUrl,
          requiresHuman: m3.data.requiresHuman,
        }
      : m3,
  });
}