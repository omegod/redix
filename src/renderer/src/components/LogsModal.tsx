import { DeleteOutlined } from "@ant-design/icons";
import { Button, Modal, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LogEntry } from "../../../shared/types";

const { Text } = Typography;

interface LogsModalProps {
  open: boolean;
  logs: LogEntry[];
  onClose: () => void;
  onClear: () => Promise<void>;
}

export const LogsModal = ({ open, logs, onClose, onClear }: LogsModalProps) => {
  const columns: ColumnsType<LogEntry> = [
    {
      title: "时间",
      dataIndex: "createdAt",
      render: (value: string) => new Date(value).toLocaleString("zh-CN"),
      width: 180
    },
    {
      title: "地址",
      dataIndex: "endpoint",
      width: 180
    },
    {
      title: "命令",
      dataIndex: "command",
      ellipsis: true
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (value: LogEntry["status"]) => (
        <Tag color={value === "success" ? "green" : "red"}>{value}</Tag>
      )
    },
    {
      title: "详情",
      dataIndex: "detail",
      render: (value?: string) => <Text type={value ? "danger" : "secondary"}>{value ?? "-"}</Text>
    }
  ];

  return (
    <Modal
      title="命令记录"
      open={open}
      onCancel={onClose}
      width={1080}
      footer={[
        <Button key="clear" danger icon={<DeleteOutlined />} onClick={async () => await onClear()}>
          清空日志
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <Space direction="vertical" size={12} className="modal-stack">
        <Text type="secondary">记录连接、扫描、键编辑和手工命令。</Text>
        <Table rowKey="id" columns={columns} dataSource={logs} pagination={{ pageSize: 8 }} />
      </Space>
    </Modal>
  );
};
