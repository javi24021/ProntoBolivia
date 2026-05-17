import type { MediaType } from "./types";

/**
 * Infiere el tipo de media desde la extensión de una URL.
 * Ignora query params antes de analizar.
 */
export function inferMediaType(url: string): MediaType {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "ogg", "aac", "wav"].includes(ext)) return "audio";
  return "document";
}
