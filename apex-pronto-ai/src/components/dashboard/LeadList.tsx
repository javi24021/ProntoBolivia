"use client";

import { LeadCard } from "./LeadCard";
import styles from "./LeadList.module.scss";
import type { Conversation } from "@/types";

export function LeadList({
  conversations,
  selectedId,
  onSelect,
  updatedAtMap,
  viewingMap,
  viewMode,
  onViewModeChange,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  updatedAtMap: Map<string, Date | null>;
  viewingMap: Map<string, string>;
  viewMode: "active" | "blocked";
  onViewModeChange: (mode: "active" | "blocked") => void;
}) {
  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Chats de clientes <span className={styles.count}>({conversations.length})</span>
        </h2>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${viewMode === "active" ? styles.tabActive : ""}`}
            onClick={() => onViewModeChange("active")}
          >
            Actuales
          </button>
          <button
            className={`${styles.tab} ${viewMode === "blocked" ? styles.tabBlocked : ""}`}
            onClick={() => onViewModeChange("blocked")}
          >
            Bloqueados
          </button>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className={styles.empty}>
          {viewMode === "blocked"
            ? "No hay chats bloqueados."
            : "No hay conversaciones que coincidan con los filtros."}
        </div>
      ) : (
        conversations.map((c) => (
          <LeadCard
            key={c.id}
            conversation={c}
            selected={c.id === selectedId}
            onClick={() => onSelect(c.id)}
            updatedAtDate={updatedAtMap.get(c.id) ?? null}
            isViewedByOther={viewingMap.has(c.id)}
          />
        ))
      )}
    </div>
  );
}