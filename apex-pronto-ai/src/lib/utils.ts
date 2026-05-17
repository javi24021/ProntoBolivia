/**
 * Helpers compartidos por todo el sistema.
 * Sin lógica de negocio — solo utilidades puras.
 */

/**
 * Normaliza un número de teléfono a formato canónico:
 * - quita espacios, guiones, paréntesis, puntos
 * - mantiene el "+" si está al inicio
 * - resultado: solo dígitos (con + opcional al inicio)
 *
 * Esto es CRÍTICO porque identificamos al cliente por teléfono.
 * "+591 700-00000" y "59170000000" deben ser la misma persona.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Logger consistente. En producción se puede reemplazar por pino/winston
 * sin tocar los call sites.
 */
type LogLevel = "info" | "warn" | "error" | "debug";

export function log(
  level: LogLevel,
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ?? {}),
  };
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
      ? console.warn
      : console.log;
  fn(JSON.stringify(payload));
}

/**
 * Trunca un texto largo para summary/lastMessage del dashboard.
 */
export function truncate(text: string, maxLen = 140): string {
  if (!text) return "";
  return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
}

/**
 * Retorna true si pasó más de N minutos desde un Date/timestamp.
 * Útil para decidir si "ya pasó suficiente tiempo" para repreguntar
 * el tipo de cliente.
 */
export function minutesSince(date: Date | number | null | undefined): number {
  if (!date) return Number.POSITIVE_INFINITY;
  const ts = typeof date === "number" ? date : date.getTime();
  return Math.floor((Date.now() - ts) / 60000);
}

/**
 * Safe JSON parse. Retorna null si falla en lugar de throw.
 * Útil para parsear respuestas de la IA.
 */
export function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}