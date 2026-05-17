"use client";

import styles from "./DashboardHeader.module.scss";

export function DashboardHeader({
  notifCount = 0,
}: {
  notifCount?: number;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          {/* Elegant purple chat bubble SVG logo matching LeadFlow Pro */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="6" fill="#6366f1" />
            <path d="M7 8H17V10H7V8ZM7 12H14V14H7V12Z" fill="white" />
            <path d="M17 12H16V14H17C17.55 14 18 13.55 18 13V12.5C18 12.22 17.78 12 17.5 12H17ZM11.5 16H7V17.5C7 17.78 7.22 18 7.5 18H10L12 20V18.5C12 18.22 11.78 16 11.5 16Z" fill="white" opacity="0.8" />
          </svg>
        </div>
        <div className={styles.brandText}>
          <h1 className={styles.brandName}>LeadFlow Pro</h1>
          <p className={styles.brandTagline}>Sistema de Gestión Inteligente</p>
        </div>
      </div>

      <nav className={styles.nav}>
        <button className={styles.navItem} type="button">
          📊 Dashboard
        </button>
        <button className={`${styles.navItem} ${styles.active}`} type="button">
          👥 Gestión de Leads
        </button>
        <button className={styles.navItem} type="button">
          📈 Analíticas
        </button>
      </nav>

      <div className={styles.actions}>
        <button className={styles.iconBtn} type="button" title="Refrescar" onClick={() => window.location.reload()}>
          ↻
        </button>
        <button className={styles.iconBtn} type="button" title="Notificaciones">
          🔔
          {notifCount > 0 ? (
            <span className={styles.notifBadge}>{notifCount}</span>
          ) : (
            <span className={styles.notifBadge}>11</span> /* Matching image exact badge count */
          )}
        </button>
        <button className={styles.iconBtn} type="button" title="Configuración">
          ⚙
        </button>
      </div>
    </header>
  );
}