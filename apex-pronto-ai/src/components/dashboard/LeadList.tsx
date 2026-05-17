"use client";

import { LeadCard } from "./LeadCard";
import styles from "./LeadList.module.scss";
import type { Conversation } from "@/types";

export function LeadList({
  conversations,
  selectedId,
  onSelect,
  updatedAtMap,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  updatedAtMap: Map<string, Date | null>;
}) {
  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Clientes <span className={styles.count}>({conversations.length})</span>
        </h2>
      </div>

      {conversations.length === 0 ? (
        <div className={styles.empty}>
          No hay conversaciones que coincidan con los filtros.
        </div>
      ) : (
        conversations.map((c) => (
          <LeadCard
            key={c.id}
            conversation={c}
            selected={c.id === selectedId}
            onClick={() => onSelect(c.id)}
            updatedAtDate={updatedAtMap.get(c.id) ?? null}
          />
        ))
      )}
    </div>
  );
}