import styles from "./ChatBubble.module.scss";

export interface ChatBubbleProps {
  role: "user" | "bot" | "system";
  text: string;
  timestamp?: string;
  isDashboard?: boolean;
}

/**
 * Burbuja adaptable.
 * - Si es dashboard: diseño minimalista (sin colas, bordes redondeados limpios, azul/gris).
 * - Si es demo-chat: burbuja WhatsApp-style con colas.
 */
export function ChatBubble({ role, text, timestamp, isDashboard = false }: ChatBubbleProps) {
  if (role === "system") {
    return (
      <div className={styles.systemRow}>
        <span className={styles.systemPill}>{text}</span>
      </div>
    );
  }

  const rowClass = `${styles.row} ${styles[role]} ${isDashboard ? styles.dashboardRow : ""}`;
  const bubbleClass = `${styles.bubble} ${styles[role]} ${isDashboard ? styles.dashboardBubble : ""}`;

  return (
    <div className={rowClass}>
      {isDashboard && role === "bot" && (
        <div className={styles.dashboardAvatar}>🤖</div>
      )}
      <div className={bubbleClass}>
        <span className={styles.text}>{text}</span>
        {timestamp && (
          <span className={styles.meta}>
            {timestamp}
            {role === "user" && !isDashboard && (
              <svg className={styles.ticks} viewBox="0 0 18 11" width="18" height="11">
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
      {isDashboard && role === "user" && (
        <div className={styles.dashboardAvatarUser}>👤</div>
      )}
    </div>
  );
}