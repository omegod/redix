import { CodeOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, List, Space, Tag, Typography } from "antd";
import { useState } from "react";
import type { SessionViewState } from "../ui-types";

const { Paragraph, Text } = Typography;

interface CommandTabProps {
  state: SessionViewState;
  onExecute: (input: string) => Promise<void>;
  onShowLogs: (input: string) => Promise<void>;
}

export const CommandTab = ({ state, onExecute }: CommandTabProps) => {
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!command.trim()) {
      return;
    }

    setBusy(true);
    try {
      await onExecute(command);
      setCommand("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-panel">
      <Card
        title={
          <Space size={8}>
            <CodeOutlined />
            <span>命令</span>
          </Space>
        }
        extra={<Text type="secondary">支持直接发送 Redis 命令并查看文本/JSON 结果。</Text>}
      >
        <div className="command-input-wrapper">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onPressEnter={async () => await submit()}
              placeholder='例：HGETALL user:1 或 SET foo "bar"'
              style={{ flex: 1 }}
            />
            <Button type="primary" icon={<SendOutlined />} loading={busy} onClick={async () => await submit()}>
              执行
            </Button>
          </Space.Compact>
        </div>
      </Card>

      <Card className="command-history-card">
        {state.commands.length === 0 ? (
          <Empty description="暂无执行记录" />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={state.commands}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <Space size={8} wrap className="command-history-head" style={{ marginBottom: 8 }}>
                  <Tag color="blue">{new Date(item.createdAt).toLocaleTimeString("zh-CN")}</Tag>
                  <Text strong>{item.command}</Text>
                </Space>
                <div className="command-output-simple">
                  {item.output}
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};
