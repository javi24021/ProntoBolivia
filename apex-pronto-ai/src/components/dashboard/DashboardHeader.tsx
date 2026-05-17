"use client";

import { HealthIndicator } from "./HealthIndicator";
import styles from "./DashboardHeader.module.scss";

export function DashboardHeader({
  notifCount = 0,
}: {
  notifCount?: number;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>💬</div>
        <div className={styles.brandText}>
          <h1 className={styles.brandName}>Bolivia Soon</h1>
          <p className={styles.brandTagline}>Sistema de Gestión Inteligente</p>
        </div>
      </div>

      <nav className={styles.nav}>
        <button className={`${styles.navItem} ${styles.active}`} type="button">
          📊 Dashboard
        </button>
        <button className={styles.navItem} type="button">
          👥 Gestión de Leads
        </button>
        <button className={styles.navItem} type="button">
          📈 Analíticas
        </button>
      </nav>

      <div className={styles.actions}>
        <HealthIndicator />
        <button className={styles.iconBtn} type="button" title="Refrescar">
          🔄
        </button>
        <button className={styles.iconBtn} type="button" title="Notificaciones">
          🔔
          {notifCount > 0 && (
            <span className={styles.notifBadge}>{notifCount}</span>
          )}
        </button>
        <button className={styles.iconBtn} type="button" title="Ajustes">
          ⚙️
        </button>
      </div>
    </header>
  );
}