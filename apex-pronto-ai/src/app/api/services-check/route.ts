import { NextResponse } from "next/server";
import { findOrCreateCustomer } from "@/services/customer.service";
import {
  findOrCreateConversation,
  addMessage,
  getRecentMessages,
} from "@/services/conversation.service";
import { findCatalogByCategoryAndType } from "@/services/catalog.service";
import { generateAIResponse } from "@/services/ai.service";

export async function GET() {
  try {
    // 1. Crear/encontrar cliente de prueba
    const cust = await findOrCreateCustomer("+59170000001", "Cliente Test");
    if (!cust.ok) return NextResponse.json({ step: "customer", ...cust });

    // 2. Crear/encontrar conversación
    const conv = await findOrCreateConversation({
      phone: "+59170000001",
      channel: "demo",
      customerId: cust.data.id,
      customerName: cust.data.name,
    });
    if (!conv.ok) return NextResponse.json({ step: "conversation", ...conv });

    // 3. Agregar mensaje de usuario
    const msg = await addMessage(conv.data.id, {
      role: "user",
      text: "Hola, quiero info de catálogo de limpieza",
      channel: "demo",
    });
    if (!msg.ok) return NextResponse.json({ step: "message", ...msg });

    // 4. Catálogo
    const catalog = findCatalogByCategoryAndType("limpieza", "mayorista");

    // 5. IA
    const ai = await generateAIResponse({
      customerName: cust.data.name,
      phone: cust.data.phone,
      channel: "demo",
      knownClientType: cust.data.lastClientType,
      lastCategory: cust.data.lastCategory,
      conversationSummary: conv.data.summary,
      history: [],
      userMessage: "Hola, quiero info de catálogo de limpieza",
    });

    // 6. Mensajes recientes
    const recent = await getRecentMessages(conv.data.id, 5);

    return NextResponse.json({
      ok: true,
      customer: { id: cust.data.id, phone: cust.data.phone },
      conversation: { id: conv.data.id, status: conv.data.status },
      messageCount: recent.length,
      catalogFound: catalog?.id ?? null,
      aiSample: {
        reply: ai.reply,
        requiresHuman: ai.requiresHuman,
        category: ai.category,
        currentClientType: ai.currentClientType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}