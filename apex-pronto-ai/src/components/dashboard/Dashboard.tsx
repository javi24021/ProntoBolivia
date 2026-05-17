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

function getTypeWeight(type: string | null): number {
  if (type === "mayorista") return 1;
  if (type === "minorista") return 2;
  return 3;
}

function getLabelWeight(label: string | null): number {
  if (label === "importante") return 1;
  if (label === "pedido_pendiente") return 2;
  if (label === "cotizacion") return 3;
  if (label === "cliente") return 4;
  if (label === "no_responder") return 99;
  return 5;
}

export function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [updatedAtMap, setUpdatedAtMap] = useState<Map<string, Date | null>>(
    new Map()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [agentId] = useState(() => "agent_" + Math.random().toString(36).substring(2, 9));
  const [viewMode, setViewMode] = useState<"active" | "blocked">("active");
  // Map of conversationId -> agentId (other agents viewing that chat)
  const [viewingMap, setViewingMap] = useState<Map<string, string>>(new Map());

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
          viewingBy: data.viewingBy ?? null,
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


    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate listener for activeSessions (presence) — completely isolated
  useEffect(() => {
    const db = getClientDb();
    const unsub = onSnapshot(collection(db, "activeSessions"), (snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((d) => {
        const data = d.data();
        const sessionAgentId = data.agentId as string;
        const convId = data.conversationId as string | null;
        // Only track OTHER agents, not ourselves
        if (convId && sessionAgentId && sessionAgentId !== agentId) {
          map.set(convId, sessionAgentId);
        }
      });
      setViewingMap(map);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // Filtrado en memoria y ordenamiento
  const filtered = useMemo(() => {
    const list = conversations.filter((c) => {
      // Tab view filter: active hides completed+blocked, blocked shows only blocked
      if (viewMode === "active") {
        if (c.status === "blocked" || c.status === "completed") return false;
      } else {
        if (c.status !== "blocked") return false;
      }

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

    list.sort((a, b) => {
      const typeA = getTypeWeight(a.currentClientType);
      const typeB = getTypeWeight(b.currentClientType);
      if (typeA !== typeB) return typeA - typeB;

      const labelA = getLabelWeight(a.label);
      const labelB = getLabelWeight(b.label);
      if (labelA !== labelB) return labelA - labelB;

      const timeA = updatedAtMap.get(a.id)?.getTime() ?? 0;
      const timeB = updatedAtMap.get(b.id)?.getTime() ?? 0;
      return timeB - timeA;
    });

    return list;
  }, [conversations, filters, updatedAtMap, viewMode]);

  // Si el chat seleccionado no está en la lista filtrada actual (por ejemplo, al cambiar de pestaña),
  // auto-selecciona el primer chat de la nueva lista filtrada.
  useEffect(() => {
    if (filtered.length > 0) {
      const isSelectedInFiltered = filtered.some((c) => c.id === selectedId);
      if (!isSelectedInFiltered) {
        setSelectedId(filtered[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

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
            viewingMap={viewingMap}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
        <div className={styles.rightPane}>
          <ChatPanel conversation={selected} agentId={agentId} />
        </div>
      </div>
    </div>
  );
}