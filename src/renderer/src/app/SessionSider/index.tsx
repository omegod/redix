import { DatabaseOutlined, DisconnectOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Layout, Tooltip } from "antd";
import type { SessionSummary } from "@shared/types";
import shared from "@renderer/styles/shared.module.less";
import styles from "./index.module.less";

const { Sider } = Layout;

interface SessionSiderProps {
  sessions: SessionSummary[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => Promise<void>;
  onOpenManager: () => void;
}

export const SessionSider = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession,
  onOpenManager
}: SessionSiderProps) => {
  return (
    <Sider width={240} className={styles.sider}>
      <Card
        title="连接会话"
        extra={
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={onOpenManager}
          />
        }
        bodyStyle={{ padding: 8 }}
        className={`${shared.cardBase} ${styles.card}`}
      >
        <div className={styles.list}>
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              className={`${styles.item} ${activeSessionId === session.sessionId ? styles.active : ""}`}
              onClick={() => onSelectSession(session.sessionId)}
            >
              <DatabaseOutlined className={styles.icon} />
              <Tooltip title={session.title} mouseEnterDelay={0.5} placement="right">
                <span className={styles.title}>{session.title}</span>
              </Tooltip>
              <Button
                type="text"
                size="small"
                className={styles.closeBtn}
                icon={<DisconnectOutlined />}
                onClick={async (event) => {
                  event.stopPropagation();
                  await onCloseSession(session.sessionId);
                }}
              />
            </div>
          ))}
        </div>
      </Card>
    </Sider>
  );
};

export default SessionSider;
