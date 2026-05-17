import styles from "./ChatBubble.module.scss";

export interface ChatBubbleProps {
  role: "user" | "bot" | "system";
  text: string;
  timestamp?: string;
}

/**
 * Burbuja de mensaje individual. Solo presentación, sin lógica.
 * Usada tanto por el DemoChat (Fase 10) como por el ChatPanel del dashboard (Fase 11).
 */
export function ChatBubble({ role, text, timestamp }: ChatBubbleProps) {
  return (
    <div className={`${styles.row} ${styles[role]}`}>
      <div className={`${styles.bubble} ${styles[role]}`}>
        {text}
        {timestamp && role !== "system" && (
          <div className={styles.meta}>{timestamp}</div>
        )}
      </div>
    </div>
  );
}