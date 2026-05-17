"use client";

import { useEffect, useState } from "react";
import styles from "./HealthIndicator.module.scss";

interface HealthResponse {
  ok: boolean;
  demoFallbackMode: boolean;
  services: {
    firebase: { ok: boolean; latencyMs?: number };
    openai: { ok: boolean; latencyMs?: number; note?: string };
  };
}

export function HealthIndicator() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/health");
        const data = (await res.json()) as HealthResponse;
        setHealth(data);
      } catch {
        // ignorar — el dot queda gris
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000); // cada 30s
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <div className={styles.wrap}>
        <span className={styles.dot} />
        <span className={styles.label}>Verificando...</span>
      </div>
    );
  }

  const fbDot = health.services.firebase.ok ? "ok" : "err";
  const aiDot = health.demoFallbackMode
    ? "warn"
    : health.services.openai.ok
    ? "ok"
    : "warn";

  return (
    <div className={styles.wrap}>
      <span className={`${styles.dot} ${styles[fbDot]}`} title="Firebase" />
      <span className={styles.label}>DB</span>
      <span className={`${styles.dot} ${styles[aiDot]}`} title="OpenAI" />
      <span className={styles.label}>IA</span>
      {health.demoFallbackMode && (
        <span className={styles.demoMode}>Modo Demo</span>
      )}
    </div>
  );
}