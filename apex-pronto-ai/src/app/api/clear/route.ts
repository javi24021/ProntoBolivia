import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

/**
 * GET /api/clear
 *
 * BORRA todas las conversaciones y customers de Firestore.
 * ⚠️ SOLO PARA DEMO/HACKATHON. Nunca dejar esto en producción.
 */
export async function GET() {
  try {
    // Borrar conversaciones (y sus mensajes en subcolección)
    const convSnap = await db.collection("conversations").get();
    let convCount = 0;
    for (const doc of convSnap.docs) {
      const msgs = await doc.ref.collection("messages").get();
      for (const msg of msgs.docs) {
        await msg.ref.delete();
      }
      await doc.ref.delete();
      convCount++;
    }

    // Borrar customers
    const custSnap = await db.collection("customers").get();
    let custCount = 0;
    for (const doc of custSnap.docs) {
      await doc.ref.delete();
      custCount++;
    }

    return NextResponse.json({
      ok: true,
      deleted: { conversations: convCount, customers: custCount },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}