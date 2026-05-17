import { getDb } from "@/lib/firebase";
import type { WhatsAppProvider } from "./types";

const VALID_PROVIDERS: WhatsAppProvider[] = ["evolution", "meta", "n8n", "none"];

/**
 * Lee el proveedor activo desde Firestore.
 * Retorna null si no existe o Firestore falla (silenciado para no bloquear el sistema).
 */
async function readFirestoreProvider(): Promise<WhatsAppProvider | null> {
  try {
    const doc = await getDb()
      .collection("system_settings")
      .doc("whatsapp_config")
      .get();

    if (!doc.exists) return null;
    const p = doc.data()?.activeProvider as WhatsAppProvider | undefined;
    return p && VALID_PROVIDERS.includes(p) ? p : null;
  } catch {
    return null;
  }
}

/**
 * Resuelve el proveedor activo:
 *  1. Firestore (dinámico, cambia en caliente)
 *  2. WHATSAPP_PROVIDER en .env (fallback estático)
 *  3. "none" (modo seguro por defecto)
 */
export async function resolveProvider(): Promise<WhatsAppProvider> {
  const fromFirestore = await readFirestoreProvider();
  if (fromFirestore) return fromFirestore;

  const fromEnv = process.env.WHATSAPP_PROVIDER as WhatsAppProvider | undefined;
  return fromEnv && VALID_PROVIDERS.includes(fromEnv) ? fromEnv : "none";
}

/**
 * Guarda el proveedor activo en Firestore.
 */
export async function saveProvider(provider: WhatsAppProvider): Promise<void> {
  await getDb()
    .collection("system_settings")
    .doc("whatsapp_config")
    .set({ activeProvider: provider }, { merge: true });
}

/**
 * Lee el proveedor guardado actualmente en Firestore (para mostrar en la UI).
 * Retorna null si no hay nada guardado.
 */
export async function getCurrentProvider(): Promise<WhatsAppProvider | null> {
  return readFirestoreProvider();
}
