import { App, Form, Input, InputNumber, Modal } from "antd";
import { useState } from "react";
import type { ItemAddPayload, KeyMetadata } from "@shared/types";
import { buildAddPayload } from "@renderer/lib/payload";

const { TextArea } = Input;

interface InsertItemModalProps {
  open: boolean;
  metadata?: KeyMetadata;
  onClose: () => void;
  onAdd: (payload: ItemAddPayload) => Promise<void>;
  onReloadKey: (key: string) => Promise<void>;
}

export const InsertItemModal = ({
  open,
  metadata,
  onClose,
  onAdd,
  onReloadKey
}: InsertItemModalProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<any>();
  const [busy, setBusy] = useState(false);

  const handleOk = async () => {
    if (!metadata) {
      return;
    }
    const values = await form.validateFields();
    const payload = buildAddPayload(metadata.key, metadata.type, values);
    setBusy(true);
    try {
      await onAdd(payload);
      await onReloadKey(metadata.key);
      form.resetFields();
      onClose();
      message.success("元素已插入");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="插入元素"
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
        style={{ paddingTop: 12 }}
      >
        <Form.Item name="field" label="Field">
          <Input />
        </Form.Item>
        <Form.Item name="score" label="Score">
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="streamFields" label="Stream 字段">
          <TextArea rows={4} placeholder="格式: field=value,field=value" />
        </Form.Item>
        <Form.Item name="value" label="Value">
          <TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InsertItemModal;
