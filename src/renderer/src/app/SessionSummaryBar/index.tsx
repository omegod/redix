import { HistoryOutlined } from "@ant-design/icons";
import { Button, Card, Space, Tag, Typography } from "antd";
import type { SessionMetrics, SessionSummary } from "@shared/types";
import shared from "@renderer/styles/shared.module.less";
import styles from "./index.module.less";

const { Text } = Typography;

interface SessionSummaryBarProps {
  session: SessionSummary;
  metrics?: SessionMetrics;
  onShowLogs: () => Promise<void>;
}

export const SessionSummaryBar = ({
  session,
  metrics,
  onShowLogs
}: SessionSummaryBarProps) => {
  return (
    <Card
      className={`${shared.cardBase} ${styles.card}`}
      bodyStyle={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0 16px" }}
    >
      <Space size={12} wrap>
        <Tag color="blue">{session.serverMode}</Tag>
        <Text>{session.endpoint}</Text>
        <Text type="secondary">Key 数量: {metrics?.keys ?? 0}</Text>
        <Text type="secondary">每秒命令数: {metrics?.opsPerSec ?? 0}</Text>
        <Text type="secondary">内存使用: {metrics?.memory ?? "-"}</Text>
      </Space>
      <div className={styles.tools}>
        <Button size="small" icon={<HistoryOutlined />} onClick={async () => await onShowLogs()}>
          命令记录
        </Button>
      </div>
    </Card>
  );
};

export default SessionSummaryBar;
