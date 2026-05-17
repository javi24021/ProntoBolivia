import styles from "./Badge.module.scss";

export type BadgeColor =
  | "red"
  | "green"
  | "yellow"
  | "orange"
  | "pink"
  | "violet"
  | "blue"
  | "gray";

export function Badge({
  color = "gray",
  children,
}: {
  color?: BadgeColor;
  children: React.ReactNode;
}) {
  return <span className={`${styles.badge} ${styles[color]}`}>{children}</span>;
}