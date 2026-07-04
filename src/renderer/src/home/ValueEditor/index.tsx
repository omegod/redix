import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, Card, Input, Space, Tag, Typography } from "antd";
import type { KeyMetadata } from "@shared/types";
import shared from "@renderer/styles/shared.module.less";
import styles from "./index.module.less";

const { TextArea } = Input;
const { Text } = Typography;

interface ValueEditorProps {
  metadata?: KeyMetadata;
  text: string;
  aux: string;
  auxLabel: string;
  auxReadOnly: boolean;
  onTextChange: (value: string) => void;
  onAuxChange: (value: string) => void;
  onSave: () => Promise<void>;
  onAddItem: () => void;
}

export const ValueEditor = ({
  metadata,
  text,
  aux,
  auxLabel,
  auxReadOnly,
  onTextChange,
  onAuxChange,
  onSave,
  onAddItem
}: ValueEditorProps) => {
  const showAux = metadata && metadata.type !== "string" && metadata.type !== "json";

  return (
    <Card
      title="编辑器"
      className={`${shared.cardBase} ${styles.editorCard}`}
      extra={
        <Space size={8}>
          {showAux ? (
            <>
              <Text type="secondary">{auxLabel}</Text>
              <Input
                value={aux}
                disabled={auxReadOnly}
                onChange={(event) => onAuxChange(event.target.value)}
              />
              <Button icon={<PlusOutlined />} onClick={onAddItem} />
            </>
          ) : null}
          <Tag>{metadata?.type === "json" ? "text/json" : "text/plain"}</Tag>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!metadata || metadata?.type === "stream"}
            onClick={async () => await onSave()}
          >
            保存
          </Button>
        </Space>
      }
    >
      <TextArea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        className={styles.textarea}
        placeholder="选择键或元素后可在这里编辑。"
      />
    </Card>
  );
};

export default ValueEditor;
