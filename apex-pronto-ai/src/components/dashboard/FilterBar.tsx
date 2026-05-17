"use client";

import styles from "./FilterBar.module.scss";

export interface Filters {
  search: string;
  clientType: string;
  category: string;
  label: string;
  channel: string;
}

export const DEFAULT_FILTERS: Filters = {
  search: "",
  clientType: "all",
  category: "all",
  label: "all",
  channel: "all",
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className={styles.bar}>
      <div className={styles.search}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
        />
      </div>

      <select
        className={styles.select}
        value={filters.clientType}
        onChange={(e) => update("clientType", e.target.value)}
      >
        <option value="all">Todos los tipos</option>
        <option value="mayorista">Mayorista</option>
        <option value="minorista">Minorista</option>
        <option value="desconocido">Desconocido</option>
      </select>

      <select
        className={styles.select}
        value={filters.category}
        onChange={(e) => update("category", e.target.value)}
      >
        <option value="all">Todas las categorías</option>
        <option value="limpieza">Limpieza</option>
        <option value="belleza">Belleza</option>
        <option value="cosmeticos">Cosméticos</option>
        <option value="articulos_bebe">Artículos de bebé</option>
      </select>

      <select
        className={styles.select}
        value={filters.label}
        onChange={(e) => update("label", e.target.value)}
      >
        <option value="all">Todas las etiquetas</option>
        <option value="cotizacion">Cotización</option>
        <option value="importante">Importante</option>
        <option value="cliente">Cliente</option>
        <option value="pedido_pendiente">Pedido pendiente</option>
        <option value="no_responder">No responder</option>
      </select>

      <select
        className={styles.select}
        value={filters.channel}
        onChange={(e) => update("channel", e.target.value)}
      >
        <option value="all">Todos los canales</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="facebook">Facebook</option>
        <option value="tiktok">TikTok</option>
        <option value="instagram">Instagram</option>
        <option value="demo">Demo</option>
      </select>
    </div>
  );
}