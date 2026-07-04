import { Card } from "antd";
import logo from "@renderer/assets/logo.png";
import styles from "./index.module.less";

interface EmptyStateProps {
  modKey: string;
  shiftKey: string;
}

export const EmptyState = ({ modKey, shiftKey }: EmptyStateProps) => {
  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <img src={logo} alt="Redix Logo" />
        </div>
        <div className={styles.shortcuts}>
          <div className={styles.shortcutItem}>
            <span className={styles.shortcutLabel}>新建连接</span>
            <span className={styles.shortcutKey}>{modKey}+{shiftKey}+A</span>
          </div>
          <div className={styles.shortcutItem}>
            <span className={styles.shortcutLabel}>打开连接</span>
            <span className={styles.shortcutKey}>{modKey}+{shiftKey}+O</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
