import { DatabaseOutlined } from "@ant-design/icons";
import { Card, Col, Collapse, Empty, Row, Space, Statistic, Typography } from "antd";
import type { ServerInfoPayload } from "../../../shared/types";
import type { SessionViewState } from "../ui-types";

const { Text } = Typography;

interface InfoTabProps {
  state: SessionViewState;
  info?: ServerInfoPayload;
}

export const InfoTab = ({ state, info }: InfoTabProps) => {
  const sections = info?.sections ?? {};
  const entries = Object.entries(sections).filter(([, value]) => Object.keys(value).length > 0);

  return (
    <div className="page-panel">
      <Row gutter={[12, 12]}>
        <Col span={6}>
          <Card>
            <Statistic title="Key 数量" value={state.metrics?.keys ?? 0} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="每秒命令数" value={state.metrics?.opsPerSec ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="内存使用" value={state.metrics?.memory ?? "-"} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Redis 版本" value={state.metrics?.redisVersion ?? "-"} />
          </Card>
        </Col>
      </Row>

      <Card className="info-sections-card">
        {entries.length === 0 ? (
          <Empty description="暂无服务器信息" />
        ) : (
          <Collapse
            items={entries.map(([name, section]) => ({
              key: name,
              label: name.toUpperCase(),
              children: (
                <Row gutter={[12, 12]}>
                  {Object.entries(section).map(([key, value]) => (
                    <Col span={12} key={key}>
                      <Card size="small">
                        <Space direction="vertical" size={2}>
                          <Text type="secondary">{key}</Text>
                          <Text>{value}</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )
            }))}
          />
        )}
      </Card>
    </div>
  );
};
