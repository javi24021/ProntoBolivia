"use client";

import { useEffect, useRef, useState } from "react";
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
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PHONE_KEY);
    if (stored) {
      setPhone(stored);
    } else {
      const fresh = generateDemoPhone();
      localStorage.setItem(PHONE_KEY, fresh);
      setPhone(fresh);
    }
    setName(localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    setError(null);

    const userMsg: UIMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: nowHHmm(),
    };
    setMessages((prev) => [...prev, userMsg]);
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

      if (data.data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: "bot",
            text: data.data!.reply,
            timestamp: nowHHmm(),
          },
        ]);
      }

      if (data.data.requiresHuman && !data.data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: "system",
            text: "(Tu mensaje fue registrado. Un asesor te responderá pronto.)",
            timestamp: nowHHmm(),
          },
        ]);
      }

      if (!name && text.split(/\s+/).length <= 3 && !text.includes("?")) {
        localStorage.setItem(NAME_KEY, text);
        setName(text);
      }
    } catch (err) {
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
          <h1 className={styles.title}>Bolivia Soon</h1>
          <p className={styles.subtitle}>Asistente virtual</p>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.resetBtn} onClick={handleReset} type="button">
            Nuevo cliente
          </button>
        </div>
      </header>

      <div className={styles.identityRow}>
        <span>📱 {phone || "..."}</span>
        {name && <span>👤 {name}</span>}
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            Escribe un mensaje para iniciar la conversación.
            <br />
            El bot te saludará y te ayudará a encontrar el catálogo correcto.
          </div>
        ) : (
          messages.map((m) => (
            <ChatBubble key={m.id} role={m.role} text={m.text} timestamp={m.timestamp} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className={styles.errorBanner}>⚠️ {error}</div>}

      <div className={styles.composer}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={loading || !input.trim()}
          type="button"
        >
          {loading ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}