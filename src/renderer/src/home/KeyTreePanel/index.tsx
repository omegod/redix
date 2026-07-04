import {
  FolderOpenOutlined,
  FolderOutlined,
  KeyOutlined
} from "@ant-design/icons";
import { Button, Empty, Tree, Typography } from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo } from "react";
import { buildKeyTree, type KeyTreeNode } from "@renderer/lib/tree";
import styles from "./index.module.less";

const { Text } = Typography;

interface TreeDataItem extends DataNode {
  fullKey?: string;
  children?: TreeDataItem[];
}

interface KeyTreePanelProps {
  keys: string[];
  selectedKey?: string;
  loadingKeys: boolean;
  keyComplete: boolean;
  onSelectKey: (key: string) => Promise<void>;
  onLoadMoreKeys: () => Promise<void>;
}

const treeToDataNode = (node: KeyTreeNode): TreeDataItem => ({
  key: node.id,
  fullKey: node.fullKey,
  isLeaf: node.isLeaf,
  title: (
    <div className={styles.nodeWrapper}>
      <span className={styles.nodeTitle}>{node.label}</span>
      {!node.isLeaf ? (
        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
          ({node.count})
        </Text>
      ) : null}
    </div>
  ),
  children: node.children.map(treeToDataNode)
});

export const KeyTreePanel = ({
  keys,
  selectedKey,
  loadingKeys,
  keyComplete,
  onSelectKey,
  onLoadMoreKeys
}: KeyTreePanelProps) => {
  const treeData = useMemo<TreeDataItem[]>(
    () => buildKeyTree(keys).map(treeToDataNode),
    [keys]
  );

  return (
    <>
      <div className={styles.treeShell}>
        {treeData.length === 0 ? (
          <Empty description={loadingKeys ? "加载中..." : "暂无键"} />
        ) : (
          <Tree
            showIcon
            blockNode
            expandAction="click"
            switcherIcon={null}
            icon={(props: any) => {
              if (props.isLeaf) return <KeyOutlined />;
              return props.expanded ? <FolderOpenOutlined /> : <FolderOutlined />;
            }}
            treeData={treeData}
            selectedKeys={selectedKey ? [selectedKey] : []}
            onSelect={async (_keys, info) => {
              const selected = info.node.isLeaf
                ? String((info.node as TreeDataItem).fullKey ?? info.node.key ?? "")
                : "";
              if (selected) {
                await onSelectKey(selected);
              }
            }}
          />
        )}
      </div>
      <Button
        block
        disabled={keyComplete || loadingKeys}
        onClick={async () => await onLoadMoreKeys()}
      >
        {keyComplete ? `加载完成 (${keys.length})` : `加载更多 (${keys.length})`}
      </Button>
    </>
  );
};

export default KeyTreePanel;
