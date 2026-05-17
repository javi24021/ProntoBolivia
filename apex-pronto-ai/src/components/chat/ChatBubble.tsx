import styles from "./ChatBubble.module.scss";

export interface ChatBubbleProps {
  role: "user" | "bot" | "system";
  text: string;
  timestamp?: string;
}

/**
 * Burbuja WhatsApp-style.
 * - user   → burbuja verde (derecha) con cola inferior-derecha
 * - bot    → burbuja blanca (izquierda) con cola inferior-izquierda
 * - system → texto centrado en píldora gris traslúcida
 */
export function ChatBubble({ role, text, timestamp }: ChatBubbleProps) {
  if (role === "system") {
    return (
      <div className={styles.systemRow}>
        <span className={styles.systemPill}>{text}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.row} ${styles[role]}`}>
      <div className={`${styles.bubble} ${styles[role]}`}>
        <span className={styles.text}>{text}</span>
        {timestamp && (
          <span className={styles.meta}>
            {timestamp}
            {role === "user" && (
              <svg className={styles.ticks} viewBox="0 0 18 11" width="18" height="11">
                {/* Double check mark — WhatsApp style */}
                <path
                  d="M17.394 0.906L7.918 10.382 4.606 7.07"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.394 0.906L3.918 10.382 0.606 7.07"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        )}
      </div>
    </div>
  );
}