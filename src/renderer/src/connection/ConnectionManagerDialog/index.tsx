import {
  FolderOpenOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { App, Button, Modal, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { ConnectionProfile } from "@shared/types";
import styles from "./index.module.less";

const { Paragraph, Text } = Typography;

interface ConnectionManagerDialogProps {
  open: boolean;
  connections: ConnectionProfile[];
  canClose: boolean;
  onClose: () => void;
  onOpen: (profileId: string) => Promise<void>;
  onCreate: () => void;
  onEdit: (profile: ConnectionProfile) => void;
  onDelete: (profile: ConnectionProfile) => Promise<void>;
}

export const ConnectionManagerDialog = ({
  open,
  connections,
  canClose,
  onClose,
  onOpen,
  onCreate,
  onEdit,
  onDelete
}: ConnectionManagerDialogProps) => {
  const { modal, message } = App.useApp();
  const [selectedId, setSelectedId] = useState<string>("");
  const [busyId, setBusyId] = useState<string>("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedId((current) => current || connections[0]?.id || "");
  }, [connections, open]);

  const columns: ColumnsType<ConnectionProfile> = useMemo(
    () => [
      { title: "名称", dataIndex: "title" },
      { title: "模式", dataIndex: "topology", width: 120 },
      {
        title: "地址",
        width: 220,
        render: (_, record) => `${record.host}:${record.port}`
      },
      { title: "数据库", dataIndex: "database", width: 100 }
    ],
    []
  );

  const selected = connections.find((item) => item.id === selectedId);

  const handleOpen = async (profile: ConnectionProfile | undefined) => {
    if (!profile) {
      return;
    }
    setBusyId(profile.id);
    try {
      await onOpen(profile.id);
    } finally {
      setBusyId("");
    }
  };

  return (
    <Modal
      title="打开连接"
      open={open}
      onCancel={onClose}
      closable={true}
      maskClosable={true}
      width={680}
      focusable={{ trap: false }}
      footer={[
        <Button key="create" icon={<PlusOutlined />} onClick={onCreate}>
          新增
        </Button>,
        <Button key="edit" disabled={!selected} onClick={() => selected && onEdit(selected)}>
          编辑
        </Button>,
        <Button
          key="delete"
          danger
          disabled={!selected}
          onClick={() => {
            if (!selected) {
              return;
            }
            modal.confirm({
              title: `删除连接 "${selected.title}" ?`,
              onOk: async () => await onDelete(selected)
            });
          }}
        >
          删除
        </Button>,
        <Button
          key="open"
          type="primary"
          icon={<FolderOpenOutlined />}
          disabled={!selected || busyId === selected.id}
          loading={!!selected && busyId === selected.id}
          onClick={() => handleOpen(selected)}
        >
          打开
        </Button>
      ]}
    >
      <div className={styles.modalStack}>
        <Paragraph type="secondary">管理并打开 Redis 会话。</Paragraph>
        <Table
          size="small"
          rowKey="id"
          style={{ minHeight: 200 }}
          scroll={{ y: 200 }}
          columns={columns}
          dataSource={connections}
          pagination={false}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedId ? [selectedId] : [],
            onChange: (keys) => setSelectedId(String(keys[0] ?? ""))
          }}
          onRow={(record) => ({
            onClick: () => setSelectedId(record.id),
            onDoubleClick: () => handleOpen(record)
          })}
        />
      </div>
    </Modal>
  );
};

export default ConnectionManagerDialog;
