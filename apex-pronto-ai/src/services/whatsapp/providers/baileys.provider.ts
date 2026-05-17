import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WAMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs";
import { log } from "@/lib/utils";
import type { 
  SendMessageInput, 
  SendMessageResult, 
  HealthCheckResult, 
  QRResult 
} from "../types";
import { processIncomingMessage } from "@/services/messageProcessor.service";

// Logger de Baileys
const logger = pino({ level: "silent" });

/**
 * Singleton para el socket de Baileys.
 * Usamos globalThis para persistir la conexión durante los reinicios de Next.js (HMR).
 */
const globalForBaileys = globalThis as unknown as {
  baileysSocket?: ReturnType<typeof makeWASocket>;
  qrBase64?: string;
  connectionStatus: HealthCheckResult["status"];
};

export async function initBaileys() {
  if (globalForBaileys.baileysSocket) return;

  const sessionDir = path.join(process.cwd(), "sessions", "baileys_auth");
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: true, // Útil para depuración inicial
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    browser: ["Pronto Bolivia", "Chrome", "1.0.0"],
    generateHighQualityLinkPreview: false,
  });

  globalForBaileys.baileysSocket = sock;
  globalForBaileys.connectionStatus = "disconnected";

  // Guardar credenciales cuando se actualizan
  sock.ev.on("creds.update", saveCreds);

  // Manejar conexión
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Guardar el QR en base64 para servirlo al frontend si se solicita
      import("qrcode").then((qrcode) => {
        qrcode.toDataURL(qr).then((url) => {
          globalForBaileys.qrBase64 = url;
        });
      });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const isLogout = statusCode === DisconnectReason.loggedOut;
      const isAuthFailure = statusCode === 401;

      log("warn", "baileys.provider", "Conexión cerrada", { statusCode, isLogout, isAuthFailure });
      
      globalForBaileys.connectionStatus = "disconnected";
      globalForBaileys.baileysSocket = undefined;
      globalForBaileys.qrBase64 = undefined;

      // Si la sesión fue cerrada o falló la autenticación (401), limpiamos credenciales para regenerar QR
      if (isLogout || isAuthFailure) {
        log("info", "baileys.provider", "Limpiando sesión expirada...");
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
      }

      // Reintentar conexión si no fue un logout manual
      if (!isLogout) {
        setTimeout(() => initBaileys(), 2000);
      }
    } else if (connection === "open") {
      log("info", "baileys.provider", "✅ Conectado a WhatsApp");
      globalForBaileys.connectionStatus = "connected";
      globalForBaileys.qrBase64 = undefined;
    }
  });

  // Manejar mensajes entrantes
  sock.ev.on("messages.upsert", async (m) => {
    if (m.type !== "notify") return;

    for (const msg of m.messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      // 🛡️ REGLA DE NEGOCIO: Ignorar grupos (@g.us) y estados (@broadcast)
      if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") {
        continue;
      }

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (!text) continue;

      const pushName = msg.pushName || null;

      log("info", "baileys.provider", "Mensaje recibido", { remoteJid, pushName });

      // Llamar al procesador central de mensajes
      // Usamos el remoteJid completo como identificador para evitar el lío del LID
      const result = await processIncomingMessage({
        phone: remoteJid, 
        channel: "whatsapp",
        text: text,
        name: pushName,
      });

      if (result.ok && result.data.reply) {
        log("info", "baileys.provider", "Enviando respuesta automática", { to: remoteJid });
        await sock.sendMessage(remoteJid, { text: result.data.reply });
      }
    }
  });
}

/**
 * Envía un mensaje usando el socket global.
 */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  if (!globalForBaileys.baileysSocket) {
    await initBaileys();
  }

  const sock = globalForBaileys.baileysSocket;
  if (!sock || globalForBaileys.connectionStatus !== "connected") {
    return { success: false, error: "WhatsApp no está conectado" };
  }

  try {
    // Si tenemos media, Baileys tiene métodos específicos
    if (input.mediaUrl) {
      // Implementación básica de envío de imagen/video por URL
      await sock.sendMessage(input.to, {
        image: { url: input.mediaUrl },
        caption: input.text
      });
    } else {
      await sock.sendMessage(input.to, { text: input.text });
    }
    
    return { success: true };
  } catch (error) {
    log("error", "baileys.provider", "Error al enviar mensaje", { error: String(error) });
    return { success: false, error: String(error) };
  }
}

/**
 * Devuelve el estado actual de la conexión.
 */
export async function checkHealth(): Promise<HealthCheckResult> {
  if (!globalForBaileys.baileysSocket) {
    // Iniciamos la conexión en segundo plano
    initBaileys().catch((err) => log("error", "baileys.provider", "Fallo al auto-iniciar", { err }));
  }

  return {
    status: globalForBaileys.connectionStatus || "disconnected",
    message: globalForBaileys.connectionStatus === "connected" ? "Conectado" : "Esperando conexión",
  };
}

/**
 * Devuelve el último QR generado.
 */
export async function getConnectionQR(): Promise<QRResult> {
  if (globalForBaileys.connectionStatus === "connected") {
    return { qrBase64: null, state: "connected", message: "Ya conectado" };
  }
  
  if (!globalForBaileys.baileysSocket) {
    await initBaileys();
  }

  return {
    qrBase64: globalForBaileys.qrBase64 || null,
    state: globalForBaileys.qrBase64 ? "qr" : "error",
    message: globalForBaileys.qrBase64 ? "Escanea el QR" : "Generando QR...",
  };
}
