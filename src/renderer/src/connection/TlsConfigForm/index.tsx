import { Button, Form, Input } from "antd";
import type { PickFileField } from "../useConnectionForm";

interface TlsConfigFormProps {
  onPickFile: (field: PickFileField) => Promise<void>;
}

export const TlsConfigForm = ({ onPickFile }: TlsConfigFormProps) => {
  return (
    <div style={{ padding: "16px 24px 0" }}>
      <Form.Item label="CA 证书" name={["tls", "caPath"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
        <Input addonAfter={<Button type="link" size="small" onClick={async () => await onPickFile(["tls", "caPath"])}>选择</Button>} />
      </Form.Item>
      <Form.Item label="客户端证书" name={["tls", "certPath"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
        <Input addonAfter={<Button type="link" size="small" onClick={async () => await onPickFile(["tls", "certPath"])}>选择</Button>} />
      </Form.Item>
      <Form.Item label="客户端私钥" name={["tls", "keyPath"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
        <Input addonAfter={<Button type="link" size="small" onClick={async () => await onPickFile(["tls", "keyPath"])}>选择</Button>} />
      </Form.Item>
      <Form.Item label="私钥密码" name={["tls", "passphrase"]} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
        <Input.Password />
      </Form.Item>
    </div>
  );
};

export default TlsConfigForm;
