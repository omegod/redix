import { DeleteOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { App, Button, Card, Input, InputNumber, Space, Tag, Typography } from "antd";
import type { KeyDetails, KeyMetadata } from "@shared/types";
import { rowContains } from "@renderer/lib/payload";
import CollectionTable from "../CollectionTable";
import styles from "./index.module.less";

const { Text } = Typography;

interface KeyDetailHeaderProps {
  detail?: KeyDetails;
  metadata?: KeyMetadata;
  keyName: string;
  ttlValue: number;
  saving: boolean;
  itemSearch: string;
  selectedRowId: string;
  onKeyNameChange: (value: string) => void;
  onTtlChange: (value: number) => void;
  setSelectedRowId: (id: string) => void;
  onDelete: () => Promise<void>;
  onReload: () => Promise<void>;
  onSave: () => Promise<void>;
}

export const KeyDetailHeader = ({
  detail,
  metadata,
  keyName,
  ttlValue,
  saving,
  itemSearch,
  selectedRowId,
  onKeyNameChange,
  onTtlChange,
  setSelectedRowId,
  onDelete,
  onReload,
  onSave
}: KeyDetailHeaderProps) => {
  const { modal, message } = App.useApp();

  const visibleRows = detail?.items.filter(
    (row) => !itemSearch.trim() || rowContains(row, itemSearch.trim())
  );

  const showTable = metadata && metadata.type !== "string" && metadata.type !== "json";

  return (
    <Card
      bodyStyle={{ padding: 12, overflow: "hidden" }}
      title={
        <Space size={8}>
          <span>键详情</span>
        </Space>
      }
      extra={
        <Space size={16}>
          {metadata ? (
            <Space size={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>Length: {metadata.length}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>Size: {metadata.sizeInBytes} B</Text>
              <Tag color="blue">{metadata.type}</Tag>
            </Space>
          ) : (
            <Tag>未选择</Tag>
          )}
        </Space>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Space
          wrap
          style={{ marginBottom: showTable ? 12 : 0 }}
        >
          <Input
            value={keyName}
            disabled={!metadata}
            onChange={(event) => onKeyNameChange(event.target.value)}
            placeholder="键名"
            className="detail-key-input"
          />
          <InputNumber
            value={ttlValue}
            disabled={!metadata}
            onChange={(value) => onTtlChange(Number(value ?? -1))}
            className="detail-ttl-input"
            addonBefore="TTL"
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={!metadata}
            onClick={() => {
              if (!metadata) {
                return;
              }
              modal.confirm({
                title: `删除键 ${metadata.key} ?`,
                onOk: async () => {
                  await onDelete();
                  message.success("已删除");
                }
              });
            }}
          >
            删除
          </Button>
          <Button icon={<ReloadOutlined />} disabled={!metadata} onClick={async () => await onReload()}>
            重载
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={!metadata}
            onClick={async () => await onSave()}
          >
            更新
          </Button>
        </Space>

        {showTable ? (
          <CollectionTable
            rows={visibleRows ?? []}
            selectedRowId={selectedRowId}
            sampleRow={detail?.items[0]}
            onSelectRow={setSelectedRowId}
          />
        ) : null}
      </div>
    </Card>
  );
};

export default KeyDetailHeader;
