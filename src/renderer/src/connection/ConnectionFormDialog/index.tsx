import { SaveOutlined } from "@ant-design/icons";
import { App, Button, Form, Modal, Tabs } from "antd";
import type { ConnectionProfile } from "@shared/types";
import { useConnectionForm } from "../useConnectionForm";
import BasicConfigForm from "../BasicConfigForm";
import SshConfigForm from "../SshConfigForm";
import TlsConfigForm from "../TlsConfigForm";
import styles from "./index.module.less";

interface ConnectionFormDialogProps {
  open: boolean;
  initialProfile: ConnectionProfile;
  onClose: () => void;
  onSave: (profile: ConnectionProfile) => Promise<void>;
}

export const ConnectionFormDialog = ({
  open,
  initialProfile,
  onClose,
  onSave
}: ConnectionFormDialogProps) => {
  const { message } = App.useApp();
  const { form, saving, testing, topology, setSaving, setTesting, pickFile, buildProfile } =
    useConnectionForm(initialProfile);

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
        className={styles.connectionForm}
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
              children: <BasicConfigForm form={form} topology={topology} />
            },
            {
              key: "ssh",
              label: "SSH 隧道",
              children: <SshConfigForm onPickFile={pickFile} />
            },
            {
              key: "tls",
              label: "SSL/TLS",
              children: <TlsConfigForm onPickFile={pickFile} />
            }
          ]}
        />
      </Form>
    </Modal>
  );
};

export default ConnectionFormDialog;
