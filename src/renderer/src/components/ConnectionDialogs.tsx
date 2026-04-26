import {
  FolderOpenOutlined,
  PlusOutlined,
  SaveOutlined
} from "@ant-design/icons";
import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { ConnectionProfile } from "../../../shared/types";

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

interface ConnectionManagerProps {
  open: boolean;
  connections: ConnectionProfile[];
  canClose: boolean;
  onClose: () => void;
  onOpen: (profileId: string) => Promise<void>;
  onCreate: () => void;
  onEdit: (profile: ConnectionProfile) => void;
  onDelete: (profile: ConnectionProfile) => Promise<void>;
}

interface ConnectionFormProps {
  open: boolean;
  initialProfile: ConnectionProfile;
  onClose: () => void;
  onSave: (profile: ConnectionProfile) => Promise<void>;
}

const parseLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const joinLines = (items: string[]) => items.join("\n");

export const ConnectionManagerDialog = ({
  open,
  connections,
  canClose,
  onClose,
  onOpen,
  onCreate,
  onEdit,
  onDelete
}: ConnectionManagerProps) => {
  const { modal } = App.useApp();
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

  return (
    <Modal
      title="打开连接"
      open={open}
      onCancel={canClose ? onClose : undefined}
      closable={canClose}
      maskClosable={canClose}
      width={980}
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
        <Button key="close" onClick={onClose} disabled={!canClose}>
          关闭
        </Button>,
        <Button
          key="open"
          type="primary"
          icon={<FolderOpenOutlined />}
          disabled={!selected || busyId === selected.id}
          loading={!!selected && busyId === selected.id}
          onClick={async () => {
            if (!selected) {
              return;
            }
            setBusyId(selected.id);
            try {
              await onOpen(selected.id);
            } finally {
              setBusyId("");
            }
          }}
        >
          打开
        </Button>
      ]}
    >
      <Space direction="vertical" size={12} className="modal-stack">
        <Paragraph type="secondary">
          保留原项目的启动体验：先管理连接，再打开 Redis 会话。
        </Paragraph>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={connections}
          pagination={false}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedId ? [selectedId] : [],
            onChange: (keys) => setSelectedId(String(keys[0] ?? ""))
          }}
          onRow={(record) => ({
            onDoubleClick: async () => {
              setBusyId(record.id);
              try {
                await onOpen(record.id);
              } finally {
                setBusyId("");
              }
            }
          })}
        />
      </Space>
    </Modal>
  );
};

export const ConnectionFormDialog = ({
  open,
  initialProfile,
  onClose,
  onSave
}: ConnectionFormProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<ConnectionProfile>();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const topology = Form.useWatch("topology", form) ?? initialProfile.topology;

  useEffect(() => {
    form.setFieldsValue({
      ...initialProfile,
      clusterNodes: joinLines(initialProfile.clusterNodes),
      sentinelNodes: joinLines(initialProfile.sentinelNodes)
    } as unknown as ConnectionProfile);
  }, [form, initialProfile]);

  const pickFile = async (
    field:
      | ["tls", "caPath"]
      | ["tls", "certPath"]
      | ["tls", "keyPath"]
      | ["ssh", "privateKeyPath"]
  ) => {
    const path = await window.api.pickFile();
    if (!path) {
      return;
    }
    form.setFieldValue(field, path);
  };

  const buildProfile = async (): Promise<ConnectionProfile> => {
    const values = await form.validateFields();
    const clusterNodes = parseLines((values as any).clusterNodes ?? "");
    const sentinelNodes = parseLines((values as any).sentinelNodes ?? "");
    return {
      ...initialProfile,
      ...values,
      clusterNodes,
      sentinelNodes
    };
  };

  return (
    <Modal
      title={initialProfile.id ? "编辑连接" : "新增连接"}
      open={open}
      onCancel={onClose}
      width={1080}
      footer={[
        <Button
          key="test"
          loading={testing}
          onClick={async () => {
            setTesting(true);
            try {
              const profile = await buildProfile();
              const result = await window.api.testConnection(profile);
              message.success(`连接成功：${result.endpoint} / ${result.serverMode}`);
            } catch (error) {
              message.error(error instanceof Error ? error.message : String(error));
            } finally {
              setTesting(false);
            }
          }}
        >
          测试连接
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(await buildProfile());
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          保存
        </Button>
      ]}
    >
      <Form form={form} layout="vertical" className="connection-form">
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label="名称" name="title" rules={[{ required: true, message: "请输入名称" }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="拓扑" name="topology">
              <Select
                options={[
                  { label: "standalone", value: "standalone" },
                  { label: "cluster", value: "cluster" },
                  { label: "sentinel", value: "sentinel" }
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Host" name="host" rules={[{ required: true, message: "请输入 Host" }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Port" name="port">
              <InputNumber min={1} max={65535} className="full-width" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Username" name="username">
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Password" name="password">
              <Input.Password />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Database" name="database">
              <InputNumber min={0} max={15} className="full-width" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="SSL/TLS" name="ssl" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        {topology === "cluster" ? (
          <Form.Item label="Cluster 节点" name="clusterNodes">
            <TextArea rows={4} placeholder={"10.0.0.1:6379\n10.0.0.2:6379"} />
          </Form.Item>
        ) : null}

        {topology === "sentinel" ? (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Sentinel 节点" name="sentinelNodes">
                <TextArea rows={4} placeholder={"10.0.0.1:26379\n10.0.0.2:26379"} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item label="Master Name" name="sentinelName">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Sentinel Username" name="sentinelUsername">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Sentinel Password" name="sentinelPassword">
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>
        ) : null}

        <div className="form-section-title">TLS</div>
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label="CA" name={["tls", "caPath"]}>
              <Input addonAfter={<Button type="link" onClick={async () => await pickFile(["tls", "caPath"])}>选择</Button>} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Cert" name={["tls", "certPath"]}>
              <Input addonAfter={<Button type="link" onClick={async () => await pickFile(["tls", "certPath"])}>选择</Button>} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Key" name={["tls", "keyPath"]}>
              <Input addonAfter={<Button type="link" onClick={async () => await pickFile(["tls", "keyPath"])}>选择</Button>} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Passphrase" name={["tls", "passphrase"]}>
              <Input.Password />
            </Form.Item>
          </Col>
        </Row>

        <div className="form-section-title">SSH</div>
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label="启用 SSH" name={["ssh", "enabled"]} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="SSH Host" name={["ssh", "host"]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="SSH Port" name={["ssh", "port"]}>
              <InputNumber min={1} max={65535} className="full-width" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="SSH User" name={["ssh", "username"]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="SSH Password" name={["ssh", "password"]}>
              <Input.Password />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Private Key" name={["ssh", "privateKeyPath"]}>
              <Input addonAfter={<Button type="link" onClick={async () => await pickFile(["ssh", "privateKeyPath"])}>选择</Button>} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
