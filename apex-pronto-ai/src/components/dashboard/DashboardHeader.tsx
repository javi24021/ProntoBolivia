"use client";

import Image from "next/image";
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
          <Image src="/ProntoLogo.jpeg" alt="Pronto Bolivia" width={40} height={40} style={{ borderRadius: '50%' }} />
        </div>
        <div className={styles.brandText}>
          <h1 className={styles.brandName}>Pronto Bolivia</h1>
          <p className={styles.brandTagline}>WhatsApp CRM Inteligente</p>
        </div>
      </div>

      <nav className={styles.nav}>
        <button className={`${styles.navItem} ${styles.active}`} type="button">
          💬 Chats
        </button>
        <button className={styles.navItem} type="button">
          👥 Contactos
        </button>
        <button className={styles.navItem} type="button">
          📈 Analíticas
        </button>
      </nav>

      <div className={styles.actions}>
        <button className={styles.iconBtn} type="button" title="Comunidades">
          👥
        </button>
        <button className={styles.iconBtn} type="button" title="Estados">
          ⭕
        </button>
        <button className={styles.iconBtn} type="button" title="Nuevo Chat">
          ➕
        </button>
        <button className={styles.iconBtn} type="button" title="Menú">
          ⋮
          {notifCount > 0 && (
            <span className={styles.notifBadge}>{notifCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}