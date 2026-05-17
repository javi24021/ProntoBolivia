import type { Catalog } from "@/types";

/**
 * Catálogos demo hardcodeados.
 *
 * Estructura:
 *  - 4 categorías x 2 tipos de cliente = 8 catálogos
 *  - Cada uno apunta a una URL de PDF/Drive/Notion (placeholder por ahora)
 *
 * Cuando exista la BD real, este archivo se reemplaza por una consulta a
 * Firestore (colección `catalogs`), y los consumidores no se enteran porque
 * todos usan `findCatalog()`.
 */
export const DEMO_CATALOGS: Catalog[] = [
  // === LIMPIEZA ===
  {
    id: "limpieza_mayorista",
    name: "Catálogo Limpieza - Mayorista",
    category: "limpieza",
    clientType: "mayorista",
    url: "https://example.com/catalogos/limpieza-mayorista.pdf",
    active: true,
  },
  {
    id: "limpieza_minorista",
    name: "Catálogo Limpieza - Minorista",
    category: "limpieza",
    clientType: "minorista",
    url: "https://example.com/catalogos/limpieza-minorista.pdf",
    active: true,
  },

  // === BELLEZA ===
  {
    id: "belleza_mayorista",
    name: "Catálogo Belleza - Mayorista",
    category: "belleza",
    clientType: "mayorista",
    url: "https://example.com/catalogos/belleza-mayorista.pdf",
    active: true,
  },
  {
    id: "belleza_minorista",
    name: "Catálogo Belleza - Minorista",
    category: "belleza",
    clientType: "minorista",
    url: "https://example.com/catalogos/belleza-minorista.pdf",
    active: true,
  },

  // === COSMÉTICOS ===
  {
    id: "cosmeticos_mayorista",
    name: "Catálogo Cosméticos - Mayorista",
    category: "cosmeticos",
    clientType: "mayorista",
    url: "https://example.com/catalogos/cosmeticos-mayorista.pdf",
    active: true,
  },
  {
    id: "cosmeticos_minorista",
    name: "Catálogo Cosméticos - Minorista",
    category: "cosmeticos",
    clientType: "minorista",
    url: "https://example.com/catalogos/cosmeticos-minorista.pdf",
    active: true,
  },

  // === ARTÍCULOS DE BEBÉ ===
  {
    id: "articulos_bebe_mayorista",
    name: "Catálogo Artículos de Bebé - Mayorista",
    category: "articulos_bebe",
    clientType: "mayorista",
    url: "https://example.com/catalogos/articulos-bebe-mayorista.pdf",
    active: true,
  },
  {
    id: "articulos_bebe_minorista",
    name: "Catálogo Artículos de Bebé - Minorista",
    category: "articulos_bebe",
    clientType: "minorista",
    url: "https://example.com/catalogos/articulos-bebe-minorista.pdf",
    active: true,
  },
];

/**
 * Busca un catálogo por id exacto.
 * Útil cuando la IA devuelve un `catalogId` en su respuesta.
 */
export function getCatalogById(id: string): Catalog | null {
  return DEMO_CATALOGS.find((c) => c.id === id && c.active) ?? null;
}

/**
 * Busca el catálogo correcto según categoría + tipo de cliente.
 * Esta es la función principal que usará el messageProcessor.
 *
 * Retorna null si:
 *  - la categoría es "desconocido"
 *  - el clientType es "desconocido"
 *  - no se encuentra match activo
 */
export function findCatalog(
  category: Catalog["category"],
  clientType: Catalog["clientType"]
): Catalog | null {
  if (category === "desconocido") return null;
  if (clientType === "desconocido") return null;

  return (
    DEMO_CATALOGS.find(
      (c) => c.category === category && c.clientType === clientType && c.active
    ) ?? null
  );
}

/**
 * Lista catálogos disponibles para una categoría (ambos tipos de cliente).
 * Útil si alguna vez queremos mostrar opciones al cliente.
 */
export function listCatalogsByCategory(
  category: Catalog["category"]
): Catalog[] {
  return DEMO_CATALOGS.filter((c) => c.category === category && c.active);
}