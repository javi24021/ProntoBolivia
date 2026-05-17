import { NextRequest, NextResponse } from "next/server";
import { releaseToBot } from "@/services/conversation.service";

export async function POST(req: NextRequest) {
  let body: { conversationId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body inválido" },
      { status: 400 }
    );
  }

  if (
    typeof body.conversationId !== "string" ||
    body.conversationId.trim() === ""
  ) {
    return NextResponse.json(
      { ok: false, error: "'conversationId' es requerido" },
      { status: 400 }
    );
  }

  const result = await releaseToBot(body.conversationId.trim());
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}