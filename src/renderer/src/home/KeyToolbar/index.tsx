import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { App, Button, Select, Space } from "antd";
import type { RedisTopology } from "@shared/types";
import styles from "./index.module.less";

interface KeyToolbarProps {
  database: number;
  topology: RedisTopology;
  onDatabaseChange: (database: number) => Promise<void>;
  onReloadKeys: () => Promise<void>;
  onCreateKey: () => void;
  onFlushDb: () => Promise<void>;
}

export const KeyToolbar = ({
  database,
  topology,
  onDatabaseChange,
  onReloadKeys,
  onCreateKey,
  onFlushDb
}: KeyToolbarProps) => {
  const { modal, message } = App.useApp();

  return (
    <Space.Compact className={styles.toolbar}>
      <Select
        value={database}
        disabled={topology === "cluster"}
        onChange={async (value) => await onDatabaseChange(value)}
        options={Array.from({ length: 16 }).map((_, index) => ({
          label: `DB${index}`,
          value: index
        }))}
      />
      <Button icon={<PlusOutlined />} onClick={onCreateKey} />
      <Button icon={<ReloadOutlined />} onClick={async () => await onReloadKeys()} />
      <Button
        danger
        icon={<DeleteOutlined />}
        onClick={() => {
          modal.confirm({
            title: `清空 DB${database} ?`,
            content: "此操作将永久删除当前数据库中的所有 Key，请谨慎操作。",
            okText: "确定清空",
            okType: "danger",
            cancelText: "取消",
            onOk: async () => {
              await onFlushDb();
              message.success(`DB${database} 已清空`);
            }
          });
        }}
      />
    </Space.Compact>
  );
};

export default KeyToolbar;
