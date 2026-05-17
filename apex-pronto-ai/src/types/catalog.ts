import type { ClientType } from "./conversation";

/** Categorías hardcodeadas. Luego vendrán de BD. */
export type Category =
  | "limpieza"
  | "belleza"
  | "cosmeticos"
  | "articulos_bebe"
  | "desconocido";

export const CATEGORIES = [
  "limpieza",
  "belleza",
  "cosmeticos",
  "articulos_bebe",
  "desconocido",
] as const;

/** Catálogo enlazable por categoría + tipo de cliente */
export interface Catalog {
  id: string;
  name: string;
  category: Category;
  clientType: ClientType;
  url: string;
  active: boolean;
}