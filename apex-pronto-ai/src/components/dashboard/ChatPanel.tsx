"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";
import { Badge } from "./Badge";
import { ChatBubble } from "@/components/chat/ChatBubble";
import styles from "./ChatPanel.module.scss";
import type { Conversation, Message } from "@/types";

function initials(name: string | null, phone: string): string {
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
  }
  return phone.slice(-2);
}

function tsToTime(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  // Defensa: serverTimestamp() puede no estar resuelto aún en el primer snapshot
  if (typeof (ts as Timestamp).toDate !== "function") return "";
  const d = (ts as Timestamp).toDate();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function statusLabel(c: Conversation): { text: string; cls: string } {
  if (c.requiresHuman) return { text: "Requiere humano", cls: "" };
  if (c.status === "human_handling") return { text: "Asesor atendiendo", cls: "human" };
  return { text: "Bot atendiendo", cls: "bot" };
}

export function ChatPanel({ conversation }: { conversation: Conversation | null }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      return;
    }

    const db = getClientDb();
    const q = query(
      collection(db, "conversations", conversation.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          role: data.role,
          text: data.text,
          channel: data.channel,
          createdAt: data.createdAt,
          metadata: data.metadata ?? {},
        };
      });
      setMessages(list);
    });

    return () => unsub();
  }, [conversation]);

  if (!conversation) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty} style={{ margin: "auto" }}>
          Selecciona un cliente para ver la conversación
        </div>
      </div>
    );
  }

  const status = statusLabel(conversation);

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <div className={styles.avatar}>
            {initials(conversation.customerName, conversation.phone)}
          </div>
          <div className={styles.info}>
            <p className={styles.name}>
              {conversation.customerName ?? conversation.phone}
            </p>
            <div className={styles.subInfo}>
              {conversation.currentClientType !== "desconocido" && (
                <Badge color="yellow">{conversation.currentClientType}</Badge>
              )}
              {conversation.category !== "desconocido" && (
                <Badge color="violet">{conversation.category}</Badge>
              )}
              <span>📱 {conversation.phone}</span>
              <span>· {conversation.channel}</span>
            </div>
          </div>
        </div>

        <div className={styles.headRight}>
          <div className={styles.statusChip}>
            <span className={`${styles.statusDot} ${styles[status.cls]}`} />
            {status.text}
          </div>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.empty}>Cargando mensajes...</div>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              role={m.role === "user" ? "user" : m.role === "system" ? "system" : "bot"}
              text={m.text}
              timestamp={tsToTime(m.createdAt as Timestamp)}
            />
          ))
        )}
      </div>

      {conversation.summary && (
        <div className={styles.summary}>
          <strong>📋 Resumen IA:</strong>
          {conversation.summary}
        </div>
      )}
    </div>
  );
}