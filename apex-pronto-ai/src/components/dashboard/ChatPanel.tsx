"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp, doc, updateDoc } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";
import { Badge } from "./Badge";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ConfirmModal } from "./ConfirmModal";
import styles from "./ChatPanel.module.scss";
import type { Conversation, Message } from "@/types";
import Image from "next/image";

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

export function ChatPanel({ conversation, agentId }: { conversation: Conversation | null; agentId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showBlockModal, setShowBlockModal] = useState(false);

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

  // Separate presence effect: write to activeSessions/{agentId}, NOT to conversations
  // This prevents onSnapshot on conversations from being triggered by presence changes
  useEffect(() => {
    if (!agentId) return;

    const db = getClientDb();
    const sessionRef = doc(db, "activeSessions", agentId);

    if (conversation?.id) {
      // Register that this agent is viewing this conversation
      updateDoc(sessionRef, { conversationId: conversation.id, updatedAt: new Date() })
        .catch(() => {
          // Document may not exist yet, use setDoc
          import("firebase/firestore").then(({ setDoc }) => {
            setDoc(sessionRef, { conversationId: conversation.id, agentId, updatedAt: new Date() });
          });
        });
    } else {
      updateDoc(sessionRef, { conversationId: null })
        .catch(() => { /* ignore if doc doesn't exist */ });
    }

    return () => {
      updateDoc(sessionRef, { conversationId: null }).catch(() => {});
    };
  }, [conversation?.id, agentId]);

  // Separate effect for clearing unreadCount — only when the selected chat changes
  useEffect(() => {
    if (!conversation?.id || !conversation.unreadCount) return;
    const db = getClientDb();
    updateDoc(doc(db, "conversations", conversation.id), { unreadCount: 0 }).catch(console.error);
    // We intentionally only run this when the conversation id changes (opening a chat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

  const handleToggleControl = async () => {
    if (!conversation) return;
    const db = getClientDb();
    const isHuman = conversation.status === "human_handling";
    await updateDoc(doc(db, "conversations", conversation.id), {
      status: isHuman ? "bot_handling" : "human_handling",
      requiresHuman: false,
    });
  };

  const handleComplete = async () => {
    if (!conversation) return;
    const db = getClientDb();
    await updateDoc(doc(db, "conversations", conversation.id), {
      status: "completed",
    });
  };

  const handleBlock = async () => {
    setShowBlockModal(true);
  };

  const confirmBlock = async () => {
    setShowBlockModal(false);
    if (!conversation) return;
    const db = getClientDb();
    await updateDoc(doc(db, "conversations", conversation.id), {
      status: "blocked",
      requiresHuman: false,
    });
  };

  const handleUnblock = async () => {
    if (!conversation) return;
    const db = getClientDb();
    await updateDoc(doc(db, "conversations", conversation.id), {
      status: "bot_handling",
      requiresHuman: false,
    });
  };

  if (!conversation) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyWrap}>
           {/* WhatsApp Web style empty state */}
           <Image src="/ProntoLogo.jpeg" alt="Pronto Bolivia" width={120} height={120} style={{ borderRadius: '50%', marginBottom: '32px', opacity: 0.8 }} />
           <h2>Pronto Bolivia CRM</h2>
           <p>Selecciona un chat de la lista para ver la conversación o enviar un mensaje.</p>
           <p className={styles.encryptionInfo}>🔒 Cifrado de extremo a extremo y protegido por IA.</p>
        </div>
      </div>
    );
  }

  const status = statusLabel(conversation);

  return (
    <div className={styles.panel}>
      {showBlockModal && (
        <ConfirmModal
          title="Bloquear conversación"
          message={`¿Deseas bloquear el chat de ${conversation.customerName ?? conversation.phone}? La IA informará al cliente de la suspensión del servicio y no responderá más mensajes.`}
          confirmLabel="Sí, bloquear"
          cancelLabel="Cancelar"
          danger
          onConfirm={confirmBlock}
          onCancel={() => setShowBlockModal(false)}
        />
      )}
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
          <button className={styles.iconBtn} title="Buscar">🔍</button>
          <button className={styles.iconBtn} title="Menú">⋮</button>
        </div>
      </div>

      <div className={styles.messagesBg}>
        <div className={styles.messagesOverlay}></div>
        <div className={styles.messages}>
          <div className={styles.systemRow}>
            <span className={styles.systemPill}>🔒 Los mensajes están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.</span>
          </div>
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
      </div>

      {conversation.summary && (
        <div className={styles.summary}>
          <strong>📋 Resumen IA:</strong>
          {conversation.summary}
        </div>
      )}
      
      {/* Footer / Composer Area */}
      <div className={styles.composerWrapper}>
        {conversation.status === "blocked" ? (
          <div className={styles.blockedBar}>
            <span>🚫 Este chat está bloqueado. La IA no responderá al cliente.</span>
            <button className={styles.unblockBtn} onClick={handleUnblock}>
              Desbloquear
            </button>
          </div>
        ) : conversation.status === "bot_handling" ? (
          <div className={styles.botControlBar}>
            <span>🤖 La IA está respondiendo a este cliente.</span>
            <div className={styles.botActions}>
              <button className={styles.controlBtn} onClick={handleToggleControl}>
                Tomar el control
              </button>
              <button className={styles.completeBtn} onClick={handleComplete} title="Marcar como completado">
                ✓ Completar
              </button>
              <button className={styles.blockBtn} onClick={handleBlock} title="Bloquear chat">
                🚫
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.humanControlBar}>
            <button 
              className={styles.controlBtnSecondary} 
              onClick={handleToggleControl} 
              title="Devolver control a la IA"
            >
              🤖
            </button>
            <div className={styles.composer}>
              <button className={styles.attachBtn} type="button">📎</button>
              <input
                className={styles.input}
                type="text"
                placeholder="Escribe un mensaje"
              />
              <button className={styles.attachBtn} type="button">📷</button>
            </div>
            <button className={styles.completeBtn} onClick={handleComplete} title="Completar">
              ✓
            </button>
            <button className={styles.blockBtn} onClick={handleBlock} title="Bloquear">
              🚫
            </button>
            <button className={styles.sendBtn} type="button">🎤</button>
          </div>
        )}
      </div>
    </div>
  );
}