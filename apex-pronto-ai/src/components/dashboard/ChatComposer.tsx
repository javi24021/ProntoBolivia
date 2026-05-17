"use client";

import { useState } from "react";
import styles from "./ChatComposer.module.scss";
import type { Conversation } from "@/types";

interface ChatComposerProps {
  conversation: Conversation;
}

const QUICK_REPLIES = [
  "Hola, soy Carlos, asesor de Pronto Bolivia. ¿En qué te puedo ayudar?",
  "Permíteme verificar el stock y te confirmo en unos minutos.",
  "Por mayoreo manejamos un descuento especial. ¿Para cuántas unidades?",
  "Para coordinar el pago y envío, ¿podrías compartirme tu ubicación?",
];

export function ChatComposer({ conversation }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHumanHandling = conversation.status === "human_handling";
  const requiresHuman = conversation.requiresHuman;
  const isBotMode = conversation.status === "bot_handling";

  const handleTakeOver = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/send-as-human", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          text: "[Asesor tomó el control de la conversación]",
          operatorName: "Asesor",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Error tomando control");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseToBot = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/release-to-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Error devolviendo al bot");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/send-as-human", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          text: trimmed,
          operatorName: "Asesor",
          channel: conversation.channel,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Error enviando mensaje");
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.composer}>
      <div className={styles.statusBar}>
        <div className={styles.statusInfo}>
          <span
            className={`${styles.statusDot} ${
              isHumanHandling ? styles.human : styles.bot
            }`}
          />
          <span>
            {isHumanHandling
              ? `Atendiendo como ${conversation.assignedTo ?? "Asesor"}`
              : requiresHuman
              ? "Cliente espera asesor"
              : "Bot atendiendo"}
          </span>
        </div>

        {isBotMode && !requiresHuman ? (
          <button
            className={`${styles.controlBtn} ${styles.takeOver}`}
            onClick={handleTakeOver}
            disabled={loading}
          >
            Tomar control
          </button>
        ) : requiresHuman && !isHumanHandling ? (
          <button
            className={`${styles.controlBtn} ${styles.takeOver}`}
            onClick={handleTakeOver}
            disabled={loading}
          >
            Atender ahora
          </button>
        ) : (
          <button
            className={styles.controlBtn}
            onClick={handleReleaseToBot}
            disabled={loading}
          >
            Devolver al bot
          </button>
        )}
      </div>

      {(isHumanHandling || requiresHuman) && (
        <div className={styles.quickReplies}>
          {QUICK_REPLIES.map((q, i) => (
            <button
              key={i}
              className={styles.quickReply}
              onClick={() => setText(q)}
              disabled={loading}
            >
              {q.length > 35 ? q.slice(0, 35) + "…" : q}
            </button>
          ))}
        </div>
      )}

      {isBotMode && !requiresHuman ? (
        <div className={styles.disabledMessage}>
          🤖 El bot está atendiendo a este cliente. Toma el control para responder manualmente.
        </div>
      ) : (
        <div className={styles.inputRow}>
          <textarea
            className={styles.textarea}
            placeholder="Escribe tu respuesta como asesor..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={loading || !text.trim()}
          >
            {loading ? "..." : "Enviar"}
          </button>
        </div>
      )}

      {error && <div className={styles.error}>⚠️ {error}</div>}
    </div>
  );
}