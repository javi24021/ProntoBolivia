import { findCatalog, getCatalogById } from "@/data/demo-catalogs";
import type { Catalog } from "@/types";

/**
 * Capa de abstracción sobre demo-catalogs.
 *
 * Hoy lee del array hardcodeado. Mañana leerá de Firestore
 * (colección `catalogs`) y los consumidores no se enteran.
 *
 * Por eso TODOS los servicios deben usar este archivo en vez de
 * importar directamente desde @/data/demo-catalogs.
 */

export function findCatalogByCategoryAndType(
  category: Catalog["category"],
  clientType: Catalog["clientType"]
): Catalog | null {
  return findCatalog(category, clientType);
}

export function findCatalogById(id: string): Catalog | null {
  return getCatalogById(id);
}