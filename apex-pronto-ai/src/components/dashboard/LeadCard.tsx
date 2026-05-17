"use client";

import { Badge, type BadgeColor } from "./Badge";
import styles from "./LeadCard.module.scss";
import type { Conversation } from "@/types";

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

function labelToBadge(label: Conversation["label"]): {
  text: string;
  color: BadgeColor;
} | null {
  if (!label) return null;
  switch (label) {
    case "importante":
      return { text: "Importante", color: "red" };
    case "cliente":
      return { text: "Cliente", color: "green" };
    case "cotizacion":
      return { text: "Cotización", color: "orange" };
    case "pedido_pendiente":
      return { text: "Pedido Pendiente", color: "pink" };
    case "no_responder":
      return { text: "No responder", color: "gray" };
  }
}

function categoryToBadge(cat: Conversation["category"]) {
  if (cat === "desconocido") return null;
  const map: Record<string, { text: string; color: BadgeColor }> = {
    limpieza: { text: "Limpieza", color: "blue" },
    belleza: { text: "Belleza", color: "violet" },
    cosmeticos: { text: "Cosméticos", color: "pink" },
    articulos_bebe: { text: "Artículos Bebé", color: "yellow" },
  };
  return map[cat] ?? null;
}

function clientTypeToBadge(type: Conversation["currentClientType"]): {
  text: string;
  color: BadgeColor;
} | null {
  if (type === "mayorista") return { text: "💰 Mayorista", color: "yellow" };
  if (type === "minorista") return { text: "🛒 Minorista", color: "blue" };
  return null;
}

function channelIcon(channel: Conversation["channel"]): string {
  const map: Record<string, string> = {
    whatsapp: "💚 WhatsApp",
    facebook: "🔵 Facebook",
    tiktok: "⚫ TikTok",
    instagram: "📷 Instagram",
    demo: "🧪 Demo",
    other: "🌐 Otro",
  };
  return map[channel] ?? channel;
}

function relativeTime(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export function LeadCard({
  conversation,
  selected,
  onClick,
  updatedAtDate,
  isViewedByOther,
}: {
  conversation: Conversation;
  selected: boolean;
  onClick: () => void;
  updatedAtDate: Date | null;
  isViewedByOther: boolean;
}) {
  const labelBadge = labelToBadge(conversation.label);
  const categoryBadge = categoryToBadge(conversation.category);
  const clientTypeBadge = clientTypeToBadge(conversation.currentClientType);

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ""}`}
      onClick={onClick}
    >
      <div className={styles.head}>
        <div className={styles.avatar}>
          {initials(conversation.customerName, conversation.phone)}
        </div>
        <div className={styles.nameWrap}>
          <div className={styles.nameRow}>
            <p className={styles.name}>
              {conversation.customerName ?? conversation.phone}
            </p>
            <span className={styles.time}>{relativeTime(updatedAtDate)}</span>
          </div>
          <div className={styles.subtitle}>
            <span className={styles.channelLabel}>{channelIcon(conversation.channel)}</span>
            <div className={styles.rightIndicators}>
              {isViewedByOther && <span className={styles.viewingAlert} title="Otro vendedor está viendo este chat">👀 Viendo</span>}
              {conversation.unreadCount > 0 && (
                <div className={styles.unread}>{conversation.unreadCount}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.badges}>
        {clientTypeBadge && (
          <Badge color={clientTypeBadge.color}>{clientTypeBadge.text}</Badge>
        )}
        {labelBadge && (
          <Badge color={labelBadge.color}>{labelBadge.text}</Badge>
        )}
        {categoryBadge && (
          <Badge color={categoryBadge.color}>{categoryBadge.text}</Badge>
        )}
      </div>

      <div className={styles.lastMessage}>💬 {conversation.lastMessage || "Sin mensajes"}</div>

      <div className={styles.meta}>
        {conversation.requiresHuman ? (
          <span className={styles.humanAlert}>⚠️ Requiere humano</span>
        ) : conversation.status === "bot_handling" ? (
          <span className={styles.botAlert}>🤖 IA atendiendo</span>
        ) : null}
      </div>
    </div>
  );
}