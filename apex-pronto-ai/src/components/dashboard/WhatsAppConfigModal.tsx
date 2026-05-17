"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./WhatsAppConfigModal.module.scss";
import type { WhatsAppProvider } from "@/services/whatsapp/types";

interface Props {
  onClose: () => void;
}

type HealthStatus = "loading" | "connected" | "disconnected" | "error";

const PROVIDER_LABELS: Record<WhatsAppProvider, string> = {
  evolution: "WhatsApp Nativo (Baileys — QR)",
  meta:      "Meta Cloud API (Oficial)",
  n8n:       "n8n Webhook",
  none:      "Ninguno (Modo simulado)",
};

export function WhatsAppConfigModal({ onClose }: Props) {
  // ── Conexión ────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<HealthStatus>("loading");
  const [statusMessage, setStatusMessage] = useState("");

  // ── QR ──────────────────────────────────────────────────────────────────────
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // ── Proveedor ────────────────────────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProvider>("none");
  const [providerLoaded, setProviderLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // ── Webhook ──────────────────────────────────────────────────────────────────
  const [syncingWebhook, setSyncingWebhook] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Health check — también trae el proveedor guardado en Firestore
  // ─────────────────────────────────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp-health");
      const data = await res.json();

      if (data.data?.status) {
        setStatus(data.data.status as HealthStatus);
        setStatusMessage(data.data.message ?? "");

        // Pre-cargar el proveedor actual desde Firestore (solo la primera vez)
        if (!providerLoaded && data.data.currentProvider) {
          setSelectedProvider(data.data.currentProvider as WhatsAppProvider);
          setProviderLoaded(true);
        }

        if (data.data.status === "connected") {
          setQrBase64(null);
          stopPolling();
        }
      } else {
        setStatus("error");
        setStatusMessage(data.data?.message ?? "");
        console.error("[WhatsAppModal] Health error:", data.error);
      }
    } catch (err) {
      setStatus("error");
      console.error("[WhatsAppModal] Fetch health falló:", err);
    }
  }, [providerLoaded]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  QR
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchQR = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await fetch("/api/whatsapp-health?action=getQR");
      const data = await res.json();

      if (data.data?.state === "connected") {
        setStatus("connected");
        setStatusMessage("¡Ya está conectado!");
        setQrBase64(null);
        stopPolling();
      } else if (data.data?.qrBase64) {
        setQrBase64(data.data.qrBase64);
      }
    } catch (err) {
      console.error("[WhatsAppModal] Fetch QR falló:", err);
    } finally {
      setQrLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Polling
  // ─────────────────────────────────────────────────────────────────────────────
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      checkHealth();
      fetchQR();
    }, 5000);
  }, [checkHealth, fetchQR]);

  useEffect(() => {
    checkHealth();
    return () => stopPolling();
  }, [checkHealth]);

  useEffect(() => {
    if (status === "disconnected") {
      fetchQR();
      startPolling();
    } else {
      stopPolling();
    }
  }, [status, fetchQR, startPolling]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Guardar proveedor
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSaveProvider = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/whatsapp-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeProvider: selectedProvider }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveMessage("✅ Proveedor guardado. Verificando estado...");
        await checkHealth();
      } else {
        setSaveMessage("❌ No se pudo guardar. Intenta de nuevo.");
      }
    } catch {
      setSaveMessage("❌ Error de red.");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  Sincronizar webhook
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSyncWebhook = async () => {
    setSyncingWebhook(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/whatsapp-health?action=syncWebhook");
      const data = await res.json();
      setSyncMessage(data.ok ? "✅ Webhook sincronizado." : `❌ ${data.data?.message ?? "Fallo al sincronizar."}`);
    } catch {
      setSyncMessage("❌ Error de red.");
    } finally {
      setSyncingWebhook(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Configuración de WhatsApp</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <p>
            Conecta tu número de WhatsApp Business escaneando el QR, o elige
            otro proveedor. El cambio es <strong>en caliente</strong>.
          </p>

          {/* Estado */}
          <div className={styles.statusBox}>
            <h3>Estado actual</h3>
            {status === "loading"      && <p className={styles.statusLoading}>⏳ Verificando...</p>}
            {status === "connected"    && <p className={styles.statusOk}>✅ {statusMessage || "Conectado"}</p>}
            {status === "disconnected" && <p className={styles.statusWarn}>⚠️ {statusMessage || "Desconectado"}</p>}
            {status === "error"        && (
              <p className={styles.statusErr} title="Revisa la consola del servidor para más detalles">
                ❌ {statusMessage || "Error al conectar con el proveedor"}
              </p>
            )}
          </div>

          {/* QR */}
          <div className={styles.qrContainer}>
            {status === "disconnected" && qrLoading && !qrBase64 && (
              <p style={{ margin: 0 }}>⏳ Generando QR...</p>
            )}
            {qrBase64 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrBase64}
                  alt="Código QR para conectar WhatsApp"
                  style={{ width: 200, height: 200, imageRendering: "pixelated" }}
                />
                <span className={styles.qrText}>
                  Escanea con WhatsApp → Dispositivos vinculados → Vincular dispositivo
                </span>
              </>
            ) : (
              <>
                <div className={styles.qrPlaceholder}>📱</div>
                <span className={styles.qrText}>
                  {status === "connected"
                    ? "WhatsApp conectado correctamente."
                    : status === "error"
                    ? "Hubo un error al generar el código QR. Revisa la consola."
                    : "El QR aparecerá aquí cuando el proveedor sea WhatsApp Nativo."}
                </span>
              </>
            )}
          </div>

          {/* Selector de proveedor */}
          <div className={styles.providerSection}>
            <h3>Proveedor activo</h3>
            <select
              id="provider-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as WhatsAppProvider)}
              className={styles.select}
            >
              {(Object.keys(PROVIDER_LABELS) as WhatsAppProvider[]).map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
            <button onClick={handleSaveProvider} disabled={saving} className={styles.btnPrimary}>
              {saving ? "Guardando…" : "Guardar proveedor"}
            </button>
            {saveMessage && <p className={styles.feedbackMsg}>{saveMessage}</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
