"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";
import { DashboardHeader } from "./DashboardHeader";
import { FilterBar, DEFAULT_FILTERS, type Filters } from "./FilterBar";
import { LeadList } from "./LeadList";
import { ChatPanel } from "./ChatPanel";
import styles from "./Dashboard.module.scss";
import type { Conversation } from "@/types";

export function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [updatedAtMap, setUpdatedAtMap] = useState<Map<string, Date | null>>(
    new Map()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Listener en tiempo real de la lista de conversaciones
  useEffect(() => {
    const db = getClientDb();
    const q = query(
      collection(db, "conversations"),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Conversation[] = [];
      const map = new Map<string, Date | null>();

      snap.docs.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          customerId: data.customerId ?? null,
          phone: data.phone ?? "",
          customerName: data.customerName ?? null,
          channel: data.channel ?? "demo",
          currentClientType: data.currentClientType ?? "desconocido",
          category: data.category ?? "desconocido",
          priority: data.priority ?? "media",
          label: data.label ?? null,
          status: data.status ?? "bot_handling",
          summary: data.summary ?? "",
          escalationReason: data.escalationReason ?? null,
          lastMessage: data.lastMessage ?? "",
          unreadCount: data.unreadCount ?? 0,
          requiresHuman: data.requiresHuman ?? false,
          assignedTo: data.assignedTo ?? null,
          lastAskedClientTypeAt: data.lastAskedClientTypeAt ?? null,
          lastAskedNameAt: data.lastAskedNameAt ?? null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
        const ts = data.updatedAt as Timestamp | null;
// Defensa: serverTimestamp() puede no estar resuelto aún en el primer snapshot
const tsDate =
  ts && typeof (ts as Timestamp).toDate === "function"
    ? (ts as Timestamp).toDate()
    : null;
map.set(d.id, tsDate);
      });

      setConversations(list);
      setUpdatedAtMap(map);

      // Auto-selecciona la primera si no hay nada seleccionado
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrado en memoria
  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filters.search) {
        const haystack = `${c.customerName ?? ""} ${c.phone}`.toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) return false;
      }
      if (filters.clientType !== "all" && c.currentClientType !== filters.clientType)
        return false;
      if (filters.category !== "all" && c.category !== filters.category)
        return false;
      if (filters.label !== "all" && c.label !== filters.label) return false;
      if (filters.channel !== "all" && c.channel !== filters.channel)
        return false;
      return true;
    });
  }, [conversations, filters]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  return (
    <div className={styles.shell}>
      <DashboardHeader notifCount={totalUnread} />
      <FilterBar filters={filters} onChange={setFilters} />

      <div className={styles.body}>
        <div className={styles.leftPane}>
          <LeadList
            conversations={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            updatedAtMap={updatedAtMap}
          />
        </div>
        <div className={styles.rightPane}>
          <ChatPanel conversation={selected} />
        </div>
      </div>
    </div>
  );
}