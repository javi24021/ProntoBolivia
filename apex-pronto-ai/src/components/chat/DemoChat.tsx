"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { collection, query, where, getDocs, orderBy, limit, Timestamp, onSnapshot } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";
import { ChatBubble } from "./ChatBubble";
import styles from "./DemoChat.module.scss";

interface UIMessage {
  id: string;
  role: "user" | "bot" | "system";
  text: string;
  timestamp: string;
}

interface ChatDemoResponse {
  ok: boolean;
  data?: {
    conversationId: string;
    customerId: string;
    reply: string;
    requiresHuman: boolean;
    status: string;
    catalogUrl: string | null;
  };
  error?: string;
}

const PHONE_KEY = "apex-demo-phone";
const NAME_KEY = "apex-demo-name";

function generateDemoPhone(): string {
  const random = Math.floor(10_000_000 + Math.random() * 89_999_999);
  return `+591${random}`;
}

function nowHHmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function DemoChat() {
  const [phone, setPhone] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const allMessages = [
    ...messages,
    ...optimisticMessages.filter((opt) => !messages.some((m) => m.text === opt.text && m.role === "user"))
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize from localStorage on mount (client-side only)
  // Deferred via queueMicrotask so it's not synchronous setState in effect
  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem(PHONE_KEY);
      if (stored) {
        setPhone(stored);
      } else {
        const fresh = generateDemoPhone();
        localStorage.setItem(PHONE_KEY, fresh);
        setPhone(fresh);
      }
      setName(localStorage.getItem(NAME_KEY) ?? "");
    });
  }, []);

  useEffect(() => {
    if (!phone) return;

    let unsubConv: (() => void) | undefined;
    let unsubMessages: (() => void) | undefined;

    const db = getClientDb();
    const qConv = query(collection(db, "conversations"), where("phone", "==", phone), limit(1));

    unsubConv = onSnapshot(qConv, (snapConv) => {
      // Limpiar oyente de mensajes anterior si cambia
      if (unsubMessages) {
        unsubMessages();
        unsubMessages = undefined;
      }

      if (snapConv.empty) {
        setMessages([]);
        return;
      }

      const convId = snapConv.docs[0].id;
      const qMsgs = query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc"));

      unsubMessages = onSnapshot(qMsgs, (snapMsgs) => {
        const history: UIMessage[] = snapMsgs.docs.map((d) => {
          const data = d.data();
          let ts = "";
          if (data.createdAt && typeof data.createdAt.toDate === "function") {
            const date = (data.createdAt as Timestamp).toDate();
            ts = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
          }
          return {
            id: d.id,
            role: data.role === "user" ? "user" : data.role === "system" ? "system" : "bot",
            text: data.text,
            timestamp: ts || nowHHmm(),
          };
        });
        setMessages(history);

        // Limpiar mensajes optimistas que ya fueron confirmados por la base de datos
        setOptimisticMessages((prev) =>
          prev.filter((opt) => !history.some((m) => m.text === opt.text && m.role === "user"))
        );
      });
    }, (err) => {
      console.error("Error en tiempo real de chat:", err);
    });

    return () => {
      if (unsubConv) unsubConv();
      if (unsubMessages) unsubMessages();
    };
  }, [phone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const handleReset = () => {
    const fresh = generateDemoPhone();
    localStorage.setItem(PHONE_KEY, fresh);
    localStorage.removeItem(NAME_KEY);
    setPhone(fresh);
    setName("");
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !phone) return;

    // Agregar de forma optimista e instantánea para eliminar cualquier delay visual
    const optMsg: UIMessage = {
      id: `opt-${Date.now()}`,
      role: "user",
      text,
      timestamp: nowHHmm(),
    };
    setOptimisticMessages((prev) => [...prev, optMsg]);

    setError(null);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          text,
          name: name || undefined,
        }),
      });

      const data: ChatDemoResponse = await res.json();

      if (!data.ok || !data.data) {
        throw new Error(data.error ?? "Error desconocido del servidor");
      }

      if (!name && text.split(/\s+/).length <= 3 && !text.includes("?")) {
        localStorage.setItem(NAME_KEY, text);
        setName(text);
      }
    } catch (err) {
      // Si falla, removemos el mensaje optimista para no dejar datos falsos
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optMsg.id));
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>
            <Image 
              src="/ProntoLogo.jpeg" 
              alt="Pronto Bolivia" 
              width={40} 
              height={40} 
              style={{ borderRadius: '50%', objectFit: 'cover' }} 
            />
          </div>
          <div className={styles.titleWrap}>
            <h1 className={styles.title}>Pronto Bolivia</h1>
            <p className={styles.subtitle}>En línea</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.iconBtn} type="button" title="Llamada (Demo)">
            📞
          </button>
          <button className={styles.iconBtn} type="button" title="Videollamada (Demo)">
            🎥
          </button>
          <button className={styles.resetBtn} onClick={handleReset} type="button" title="Nuevo cliente">
            🔄
          </button>
        </div>
      </header>

      {/* Identity row - WhatsApp style floating info pill */}
      <div className={styles.identityWrapper}>
        <div className={styles.identityPill}>
          <span>📱 {phone || "..."}</span>
          {name && <span>👤 {name}</span>}
        </div>
      </div>

      <div className={styles.messagesBg}>
        {/* Usamos el fondo de WhatsApp proporcionado */}
        <div className={styles.messagesOverlay}></div>
        <div className={styles.messages}>
          <div className={styles.systemRow}>
            <span className={styles.systemPill}>🔒 Los mensajes están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos. Haz clic para obtener más información.</span>
          </div>

          {allMessages.length === 0 ? null : (
            allMessages.map((m) => (
              <ChatBubble key={m.id} role={m.role} text={m.text} timestamp={m.timestamp} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {error && <div className={styles.errorBanner}>⚠️ {error}</div>}

      <div className={styles.composerWrapper}>
        <div className={styles.composer}>
          <button className={styles.attachBtn} type="button">📎</button>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Escribe un mensaje"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className={styles.attachBtn} type="button">📷</button>
        </div>
        <button
          className={`${styles.sendBtn} ${input.trim() ? styles.active : ''}`}
          onClick={handleSend}
          disabled={loading || !input.trim()}
          type="button"
        >
          {loading ? "..." : (input.trim() ? "➤" : "🎤")}
        </button>
      </div>
    </div>
  );
}