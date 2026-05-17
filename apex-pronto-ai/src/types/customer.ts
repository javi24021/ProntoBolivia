import type { FirestoreDate } from "./common";
import type { ClientType } from "./conversation";
import type { Category } from "./catalog";

/**
 * Cliente persistente. Se identifica por número de teléfono.
 * NO se considera el tipo de cliente como permanente: una persona
 * puede comprar como mayorista una vez y minorista otra.
 */
export interface Customer {
  id: string;
  phone: string;
  name: string | null;

  /** Tipo de cliente "habitual" (estadístico, no obligatorio) */
  usualClientType: ClientType;
  /** Último tipo de cliente con el que compró */
  lastClientType: ClientType;

  recurrent: boolean;
  blocked: boolean;

  /** Score interno para ordenar leads en el dashboard */
  priorityScore: number;

  favoriteCategories: Category[];
  lastCategory: Category | null;
  lastCatalogSent: string | null;

  /** Resumen acumulado del cliente (no de la conversación actual) */
  summary: string;

  lastInteractionAt: FirestoreDate | null;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

/** Payload para crear un customer nuevo */
export type CustomerCreateInput = Pick<Customer, "phone"> &
  Partial<Pick<Customer, "name" | "usualClientType" | "lastClientType">>;