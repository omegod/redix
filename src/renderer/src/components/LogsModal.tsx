import { DeleteOutlined } from "@ant-design/icons";
import { App, Button, Modal, Space, Table, Tag, Typography } from "antd";
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
  const { message } = App.useApp();
  
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
      width: 100,
      render: (value: LogEntry["status"]) => (
        <Tag color={value === "success" ? "green" : "red"}>
          {value === "success" ? "成功" : "失败"}
        </Tag>
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
      <Space direction="vertical" size={12} className="modal-stack" style={{ width: '100%' }}>
        <Text type="secondary">记录连接、扫描、键编辑和手工命令。</Text>
        <Table
          rowKey="id"
          size="small"
          style={{minHeight: 410}}
          scroll={{ y: 320 }}
          columns={columns}
          dataSource={logs}
          pagination={{ defaultPageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: "暂无记录" }}
        />
      </Space>
    </Modal>
  );
};
