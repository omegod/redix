import { Col, Form, Input, InputNumber, Row, Select, Switch } from "antd";
import type { FormInstance } from "antd";
import type { ConnectionProfile, RedisTopology } from "@shared/types";

const { TextArea } = Input;

interface BasicConfigFormProps {
  form: FormInstance<ConnectionProfile>;
  topology: RedisTopology;
}

export const BasicConfigForm = ({ form, topology }: BasicConfigFormProps) => {
  return (
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
  );
};

export default BasicConfigForm;
