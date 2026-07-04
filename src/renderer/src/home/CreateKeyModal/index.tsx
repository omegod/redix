import { App, Form, Input, InputNumber, Modal, Select } from "antd";
import { useState } from "react";
import type { CreateKeyPayload } from "@shared/types";

const { TextArea } = Input;

interface CreateKeyModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateKeyPayload) => Promise<void>;
  onReloadKeys: () => Promise<void>;
}

interface CreateModalValue {
  key: string;
  keyType: CreateKeyPayload["keyType"];
  value?: string;
  field?: string;
  score?: number;
  streamFields?: string;
}

export const CreateKeyModal = ({ open, onClose, onCreate, onReloadKeys }: CreateKeyModalProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateModalValue>();
  const [busy, setBusy] = useState(false);

  const handleOk = async () => {
    const values = await form.validateFields();
    setBusy(true);
    try {
      await onCreate(values);
      await onReloadKeys();
      form.resetFields();
      onClose();
      message.success("键已创建");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="新增键"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={busy}
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 20 }}
        labelAlign="right"
        initialValues={{ keyType: "string", score: 0 }}
        style={{ paddingTop: 12 }}
      >
        <Form.Item name="key" label="键名" rules={[{ required: true, message: "请输入键名" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="keyType" label="类型">
          <Select
            options={[
              { label: "string", value: "string" },
              { label: "hash", value: "hash" },
              { label: "list", value: "list" },
              { label: "set", value: "set" },
              { label: "zset", value: "zset" },
              { label: "stream", value: "stream" }
            ]}
          />
        </Form.Item>
        <Form.Item name="field" label="Field">
          <Input />
        </Form.Item>
        <Form.Item name="score" label="Score">
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="value" label="初始值">
          <TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateKeyModal;
