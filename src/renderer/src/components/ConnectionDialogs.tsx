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
  Tabs,
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

  return (
    <Modal
      title="打开连接"
      open={open}
      onCancel={onClose}
      closable={true}
      maskClosable={true}
      width={680}
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
      <div className="modal-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Paragraph type="secondary">
          管理并打开 Redis 会话。
        </Paragraph>
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
        </div>
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
      width={720}
      bodyStyle={{ padding: "12px 0 0" }}
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
      <Form
        form={form}
        layout="horizontal"
        className="connection-form"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
      >
        <Tabs
          defaultActiveKey="basic"
          type="card"
          items={[
            {
              key: "basic",
              label: "基础配置",
              children: (
                <div style={{ padding: "16px 24px 0" }}>
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label="名称" name="title" rules={[{ required: true, message: "请输入名称" }]}>
                        <Input placeholder="本地开发" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="拓扑" name="topology">
                        <Select
                          options={[
                            { label: "Standalone", value: "standalone" },
                            { label: "Cluster", value: "cluster" },
                            { label: "Sentinel", value: "sentinel" }
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label="地址" name="host" rules={[{ required: true, message: "Host" }]}>
                        <Input placeholder="127.0.0.1" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="端口" name="port">
                        <InputNumber min={1} max={65535} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label="用户名" name="username">
                        <Input placeholder="可选" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="密码" name="password">
                        <Input.Password placeholder="可选" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label="数据库" name="database">
                        <InputNumber min={0} max={15} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="SSL" name="ssl" valuePropName="checked">
                        <Switch size="small" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {topology === "cluster" ? (
                    <Form.Item label="节点列表" name="clusterNodes" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                      <TextArea rows={3} placeholder={"10.0.0.1:6379\n10.0.0.2:6379"} />
                    </Form.Item>
                  ) : null}

                  {topology === "sentinel" ? (
                    <>
                      <Form.Item label="Master" name="sentinelName" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                        <Input placeholder="mymaster" />
                      </Form.Item>
                      <Form.Item label="节点列表" name="sentinelNodes" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                        <TextArea rows={2} placeholder={"10.0.0.1:26379\n10.0.0.2:26379"} />
                      </Form.Item>
                      <Row gutter={24}>
                        <Col span={12}>
                          <Form.Item label="S-用户名" name="sentinelUsername">
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="S-密码" name="sentinelPassword">
                            <Input.Password />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  ) : null}
                </div>
              )
            },
            {
              key: "ssh",
              label: "SSH 隧道",
              children: (
                <div style={{ padding: "16px 24px 0" }}>
                  <Form.Item label="启用 SSH" name={["ssh", "enabled"]} valuePropName="checked" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                    <Switch size="small" />
                  </Form.Item>
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label="SSH 主机" name={["ssh", "host"]}>
                        <Input placeholder="主机地址" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="SSH 端口" name={["ssh", "port"]}>
                        <InputNumber min={1} max={65535} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label="用户名" name={["ssh", "username"]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="密码" name={["ssh", "password"]}>
                        <Input.Password placeholder="私钥模式可空" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="私钥路径" name={["ssh", "privateKeyPath"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                    <Input addonAfter={<Button type="link" size="small" onClick={async () => await pickFile(["ssh", "privateKeyPath"])}>选择</Button>} />
                  </Form.Item>
                </div>
              )
            },
            {
              key: "tls",
              label: "SSL/TLS",
              children: (
                <div style={{ padding: "16px 24px 0" }}>
                  <Form.Item label="CA 证书" name={["tls", "caPath"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                    <Input addonAfter={<Button type="link" size="small" onClick={async () => await pickFile(["tls", "caPath"])}>选择</Button>} />
                  </Form.Item>
                  <Form.Item label="客户端证书" name={["tls", "certPath"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                    <Input addonAfter={<Button type="link" size="small" onClick={async () => await pickFile(["tls", "certPath"])}>选择</Button>} />
                  </Form.Item>
                  <Form.Item label="客户端私钥" name={["tls", "keyPath"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                    <Input addonAfter={<Button type="link" size="small" onClick={async () => await pickFile(["tls", "keyPath"])}>选择</Button>} />
                  </Form.Item>
                  <Form.Item label="私钥密码" name={["tls", "passphrase"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                    <Input.Password />
                  </Form.Item>
                </div>
              )
            }
          ]}
        />
      </Form>
    </Modal>
  );
};
