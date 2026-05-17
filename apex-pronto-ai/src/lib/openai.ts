import OpenAI from "openai";

/**
 * Cliente OpenAI singleton.
 *
 * ⚠️ SOLO BACKEND. Este módulo nunca debe importarse desde un
 * componente cliente ("use client"), porque expondría la API key.
 *
 * Se importa únicamente desde:
 *  - src/services/ai.service.ts
 *  - src/app/api/**\/route.ts
 */

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[openai] AI_API_KEY no está configurada en .env.local"
    );
  }

  _client = new OpenAI({ apiKey });
  return _client;
}

/** Modelo a usar, con fallback seguro */
export function getAIModel(): string {
  return process.env.AI_MODEL || "gpt-4o-mini";
}

/** Provider configurado (por si luego sumamos Anthropic, etc.) */
export function getAIProvider(): string {
  return process.env.AI_PROVIDER || "openai";
}