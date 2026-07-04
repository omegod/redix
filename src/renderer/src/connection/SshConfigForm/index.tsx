import { Button, Col, Form, Input, InputNumber, Row, Switch } from "antd";
import type { PickFileField } from "../useConnectionForm";

interface SshConfigFormProps {
  onPickFile: (field: PickFileField) => Promise<void>;
}

export const SshConfigForm = ({ onPickFile }: SshConfigFormProps) => {
  return (
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
        <Input addonAfter={<Button type="link" size="small" onClick={async () => await onPickFile(["ssh", "privateKeyPath"])}>选择</Button>} />
      </Form.Item>
    </div>
  );
};

export default SshConfigForm;
