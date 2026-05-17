import { readFileSync } from "fs";
import { resolve } from "path";
import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK (server-side).
 *
 * Este módulo SOLO se importa desde:
 *  - src/services/**
 *  - src/app/api/**\/route.ts
 *
 * NUNCA debe importarse desde componentes con "use client".
 * Para el frontend, en Fase 11 crearemos src/lib/firebase-client.ts
 * que usará el SDK web (firebase/firestore).
 */

function loadServiceAccount(): ServiceAccount {
  const path =
    process.env.FIREBASE_ADMIN_CREDENTIALS_PATH ?? "./firebase-admin-key.json";
  const absolute = resolve(process.cwd(), path);

  try {
    const raw = readFileSync(absolute, "utf-8");
    return JSON.parse(raw) as ServiceAccount;
  } catch (error) {
    throw new Error(
      `[firebase-admin] No se pudo leer el service account en "${absolute}". ` +
        `Verifica que el archivo existe y FIREBASE_ADMIN_CREDENTIALS_PATH apunta correctamente. ` +
        `Error: ${String(error)}`
    );
  }
}

let _app: App | null = null;
let _db: Firestore | null = null;

function getFirebaseAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const serviceAccount = loadServiceAccount();
  _app = initializeApp({
    credential: cert(serviceAccount),
  });
  console.log("[firebase-admin] Admin SDK inicializado");
  return _app;
}

export function getDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseAdminApp());
  return _db;
}

/** Re-export para conveniencia */
export const db = getDb();

/** Re-export del tipo Timestamp para usar en servicios */
export { Timestamp, FieldValue } from "firebase-admin/firestore";