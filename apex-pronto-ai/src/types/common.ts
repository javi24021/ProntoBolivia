import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * Tipo flexible para fechas en Firestore.
 *
 * - Al ESCRIBIR: usamos `serverTimestamp()` que es FieldValue.
 * - Al LEER desde Firestore: viene como Timestamp.
 * - Al SERIALIZAR a JSON (API responses): se vuelve string ISO o number.
 *
 * Aceptar todos evita drama en los límites cliente/servidor.
 */
export type FirestoreDate = Timestamp | FieldValue | string | number | Date;

/** Resultado genérico de operaciones de servicio */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };