import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FolderOpenOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SaveOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tree,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DataNode } from "antd/es/tree";
import { useEffect, useMemo, useState } from "react";
import type { CreateKeyPayload, ItemAddPayload, ItemSavePayload, KeyRow, SessionSummary } from "../../../shared/types";
import { buildKeyTree, type KeyTreeNode } from "../lib/tree";
import type { SessionViewState } from "../ui-types";

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

interface TreeDataItem extends DataNode {
  fullKey?: string;
  children?: TreeDataItem[];
}

interface HomeTabProps {
  session: SessionSummary;
  state: SessionViewState;
  onSearchChange: (value: string) => void;
  onDatabaseChange: (database: number) => Promise<void>;
  onReloadKeys: () => Promise<void>;
  onLoadMoreKeys: () => Promise<void>;
  onSelectKey: (key: string) => Promise<void>;
  onReloadKey: (key?: string) => Promise<void>;
  onLoadMoreItems: (key: string, cursor: string) => Promise<void>;
  onDeleteKey: (key: string) => Promise<void>;
  onRenameKey: (key: string, newKey: string) => Promise<void>;
  onUpdateTtl: (key: string, ttl: number) => Promise<void>;
  onSaveString: (key: string, value: string) => Promise<void>;
  onCreateKey: (payload: CreateKeyPayload) => Promise<void>;
  onAddItem: (payload: ItemAddPayload) => Promise<void>;
  onSaveItem: (payload: ItemSavePayload) => Promise<void>;
  onDeleteItem: (payload: ItemSavePayload) => Promise<void>;
}

const isJsonLike = (value: string) => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const prettyJson = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

interface EditorDraft {
  aux: string;
  auxLabel: string;
  text: string;
  readOnlyAux: boolean;
}

const rowEditorState = (row: KeyRow): EditorDraft => {
  switch (row.rowType) {
    case "hash":
      return {
        aux: row.field,
        auxLabel: "键名",
        text: isJsonLike(row.value) ? prettyJson(row.value) : row.value,
        readOnlyAux: false
      };
    case "list":
      return {
        aux: String(row.index),
        auxLabel: "索引",
        text: isJsonLike(row.value) ? prettyJson(row.value) : row.value,
        readOnlyAux: true
      };
    case "set":
      return {
        aux: "",
        auxLabel: "元素",
        text: isJsonLike(row.value) ? prettyJson(row.value) : row.value,
        readOnlyAux: true
      };
    case "zset":
      return {
        aux: String(row.score),
        auxLabel: "Score",
        text: isJsonLike(row.value) ? prettyJson(row.value) : row.value,
        readOnlyAux: false
      };
    case "stream":
      return {
        aux: row.entryId,
        auxLabel: "Entry ID",
        text: JSON.stringify(row.value, null, 2),
        readOnlyAux: true
      };
  }
};

const rowContains = (row: KeyRow, keyword: string) => {
  const normalized = keyword.toLowerCase();
  if (row.rowType === "hash") {
    return row.field.toLowerCase().includes(normalized) || row.value.toLowerCase().includes(normalized);
  }
  if (row.rowType === "list" || row.rowType === "set" || row.rowType === "zset") {
    return row.value.toLowerCase().includes(normalized);
  }
  return JSON.stringify(row.value).toLowerCase().includes(normalized);
};

const treeToDataNode = (node: KeyTreeNode): TreeDataItem => ({
  key: node.id,
  fullKey: node.fullKey,
  isLeaf: node.isLeaf,
  title: (
    <Space size={6}>
      {node.isLeaf ? <KeyOutlined /> : <FolderOpenOutlined />}
      <span>{node.label}</span>
      {!node.isLeaf ? <Text type="secondary">({node.count})</Text> : null}
    </Space>
  ),
  children: node.children.map(treeToDataNode)
});

const buildColumns = (row: KeyRow | undefined): ColumnsType<KeyRow> => {
  if (!row) {
    return [];
  }

  if (row.rowType === "hash") {
    return [
      { title: "key", dataIndex: "field" },
      { title: "Value", dataIndex: "value", ellipsis: true },
      { title: "KeyLength", dataIndex: "fieldLength", width: 110 },
      { title: "KeySize", dataIndex: "fieldSize", width: 100 },
      { title: "ValueLength", dataIndex: "valueLength", width: 120 },
      { title: "ValueSize", dataIndex: "valueSize", width: 110 }
    ];
  }
  if (row.rowType === "list") {
    return [
      { title: "Index", dataIndex: "index", width: 100 },
      { title: "Value", dataIndex: "value", ellipsis: true },
      { title: "ValueLength", dataIndex: "valueLength", width: 120 },
      { title: "ValueSize", dataIndex: "valueSize", width: 110 }
    ];
  }
  if (row.rowType === "set") {
    return [
      { title: "Value", dataIndex: "value", ellipsis: true },
      { title: "ValueLength", dataIndex: "valueLength", width: 120 },
      { title: "ValueSize", dataIndex: "valueSize", width: 110 }
    ];
  }
  if (row.rowType === "zset") {
    return [
      { title: "Score", dataIndex: "score", width: 120 },
      { title: "Value", dataIndex: "value", ellipsis: true },
      { title: "ValueLength", dataIndex: "valueLength", width: 120 },
      { title: "ValueSize", dataIndex: "valueSize", width: 110 }
    ];
  }
  return [
    { title: "ID", dataIndex: "entryId", width: 180 },
    { title: "FieldCount", dataIndex: "fieldCount", width: 120 },
    { title: "ValueSize", dataIndex: "valueSize", width: 110 },
    {
      title: "Value",
      render: (_, record) => JSON.stringify((record as Extract<KeyRow, { rowType: "stream" }>).value),
      ellipsis: true
    }
  ];
};

interface CreateModalValue {
  key: string;
  keyType: CreateKeyPayload["keyType"];
  value?: string;
  field?: string;
  score?: number;
  streamFields?: string;
}

export const HomeTab = ({
  session,
  state,
  onSearchChange,
  onDatabaseChange,
  onReloadKeys,
  onLoadMoreKeys,
  onSelectKey,
  onReloadKey,
  onLoadMoreItems,
  onDeleteKey,
  onRenameKey,
  onUpdateTtl,
  onSaveString,
  onCreateKey,
  onAddItem,
  onSaveItem,
  onDeleteItem
}: HomeTabProps) => {
  const { modal, message } = App.useApp();
  const [keyName, setKeyName] = useState("");
  const [ttlValue, setTtlValue] = useState(-1);
  const [editorText, setEditorText] = useState("");
  const [editorAux, setEditorAux] = useState("");
  const [editorAuxLabel, setEditorAuxLabel] = useState("键名");
  const [editorAuxReadonly, setEditorAuxReadonly] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string>("");
  const [itemSearch, setItemSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<CreateModalValue>();
  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm] = Form.useForm<any>();

  const treeData = useMemo<TreeDataItem[]>(() => buildKeyTree(state.keys).map(treeToDataNode), [state.keys]);
  const detail = state.keyDetails;
  const metadata = detail?.metadata;
  const selectedRow = detail?.items.find((row) => row.id === selectedRowId);
  const visibleRows = detail?.items.filter((row) => !itemSearch.trim() || rowContains(row, itemSearch.trim()));

  useEffect(() => {
    if (!metadata) {
      setKeyName("");
      setTtlValue(-1);
      setEditorText("");
      setEditorAux("");
      setSelectedRowId("");
      return;
    }

    setKeyName(metadata.key);
    setTtlValue(metadata.ttl);

    if (metadata.type === "string" || metadata.type === "json") {
      const value = detail?.stringValue ?? "";
      setEditorText(metadata.type === "json" ? prettyJson(value) : value);
      setEditorAux("");
      setEditorAuxReadonly(false);
      setEditorAuxLabel("内容");
      setSelectedRowId("");
      return;
    }

    const nextRow = detail?.items.find((row) => row.id === selectedRowId) ?? detail?.items[0];
    if (!nextRow) {
      setEditorText("");
      setEditorAux("");
      setSelectedRowId("");
      return;
    }

    setSelectedRowId(nextRow.id);
    const draft = rowEditorState(nextRow);
    setEditorText(draft.text);
    setEditorAux(draft.aux);
    setEditorAuxLabel(draft.auxLabel);
    setEditorAuxReadonly(draft.readOnlyAux);
  }, [detail, metadata, selectedRowId]);

  const handleSaveTop = async () => {
    if (!metadata) {
      return;
    }

    setSaving(true);
    try {
      let currentKey = metadata.key;
      if (keyName.trim() && keyName !== metadata.key) {
        await onRenameKey(metadata.key, keyName.trim());
        currentKey = keyName.trim();
      }
      if (ttlValue !== metadata.ttl) {
        await onUpdateTtl(currentKey, ttlValue);
      }
      if (metadata.type === "string" || metadata.type === "json") {
        await onSaveString(currentKey, editorText);
      }
      await onReloadKey(currentKey);
      message.success("已更新");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async () => {
    if (!metadata) {
      return;
    }
    if (metadata.type === "string" || metadata.type === "json") {
      await onSaveString(metadata.key, editorText);
      await onReloadKey(metadata.key);
      message.success("已保存");
      return;
    }
    if (!selectedRow) {
      return;
    }

    const payload = buildSavePayload(metadata.key, metadata.type, selectedRow, editorAux, editorText);
    await onSaveItem(payload);
    await onReloadKey(metadata.key);
    message.success("元素已更新");
  };

  return (
    <div className="home-ant-layout">
      <Card className="home-sidebar-card" bodyStyle={{ padding: 12 }}>
        <Space direction="vertical" size={12} className="sidebar-stack">
          <Space.Compact className="toolbar-compact">
            <Select
              value={state.database}
              disabled={session.topology === "cluster"}
              onChange={async (value) => await onDatabaseChange(value)}
              options={Array.from({ length: 16 }).map((_, index) => ({
                label: `DB${index}`,
                value: index
              }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新增
            </Button>
            <Button icon={<ReloadOutlined />} onClick={async () => await onReloadKeys()} />
          </Space.Compact>

          <Input.Search
            value={state.search}
            onChange={(event) => onSearchChange(event.target.value)}
            onSearch={async () => await onReloadKeys()}
            placeholder="请输入搜索词..."
            enterButton={<SearchOutlined />}
          />

          <div className="tree-shell">
            {treeData.length === 0 ? (
              <Empty description={state.loadingKeys ? "加载中..." : "暂无键"} />
            ) : (
              <Tree
                showIcon={false}
                switcherIcon={({ expanded }) => (expanded ? <DownOutlined /> : <RightOutlined />)}
                treeData={treeData}
                selectedKeys={state.selectedKey ? [state.selectedKey] : []}
                onSelect={async (_keys, info) => {
                  const selectedKey = info.node.isLeaf
                    ? String((info.node as TreeDataItem).fullKey ?? info.node.key ?? "")
                    : "";
                  if (selectedKey) {
                    await onSelectKey(selectedKey);
                  }
                }}
              />
            )}
          </div>

          <Space className="sidebar-stats" split={<span>|</span>}>
            <Text type="secondary">当前 {state.keys.length}</Text>
            <Text type="secondary">{state.keyComplete ? "加载完成" : "可继续加载"}</Text>
          </Space>

          <Button disabled={state.keyComplete || state.loadingKeys} onClick={async () => await onLoadMoreKeys()}>
            {state.keyComplete ? "加载完成" : "加载更多"}
          </Button>
        </Space>
      </Card>

      <div className="home-detail-stack">
        <Card
          bodyStyle={{ padding: 16 }}
          title={
            <Space size={8}>
              <EditOutlined />
              <span>键详情</span>
            </Space>
          }
          extra={
            metadata ? <Tag color="blue">{metadata.type}</Tag> : <Tag>未选择</Tag>
          }
        >
          <Space direction="vertical" size={12} className="detail-stack">
            <Space wrap>
              <Input
                value={keyName}
                disabled={!metadata}
                onChange={(event) => setKeyName(event.target.value)}
                placeholder="键名"
                className="detail-key-input"
              />
              <InputNumber
                value={ttlValue}
                disabled={!metadata}
                onChange={(value) => setTtlValue(Number(value ?? -1))}
                className="detail-ttl-input"
                addonBefore="TTL"
              />
              <Button danger icon={<DeleteOutlined />} disabled={!metadata} onClick={() => {
                if (!metadata) {
                  return;
                }
                modal.confirm({
                  title: `删除键 ${metadata.key} ?`,
                  onOk: async () => {
                    await onDeleteKey(metadata.key);
                    message.success("已删除");
                  }
                });
              }}>
                删除
              </Button>
              <Button icon={<ReloadOutlined />} disabled={!metadata} onClick={async () => await onReloadKey()}>
                重载
              </Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!metadata} onClick={async () => await handleSaveTop()}>
                更新
              </Button>
            </Space>

            <Space size={20}>
              <Text type="secondary">Length: {metadata?.length ?? 0}</Text>
              <Text type="secondary">Size: {metadata?.sizeInBytes ?? 0} B</Text>
            </Space>
          </Space>
        </Card>

        {metadata && metadata.type !== "string" && metadata.type !== "json" ? (
          <Row gutter={12}>
            <Col flex="minmax(0, 1fr)">
              <Card title="集合数据" bodyStyle={{ padding: 0 }}>
                <Table<KeyRow>
                  rowKey="id"
                  dataSource={visibleRows}
                  columns={buildColumns(detail?.items[0])}
                  pagination={false}
                  locale={{ emptyText: <Empty description="暂无数据" /> }}
                  rowSelection={{
                    type: "radio",
                    selectedRowKeys: selectedRowId ? [selectedRowId] : [],
                    onChange: (keys) => setSelectedRowId(String(keys[0] ?? ""))
                  }}
                />
              </Card>
            </Col>
            <Col flex="240px">
              <Card title="操作">
                <Space direction="vertical" size={12} className="sidebar-stack">
                  <Input
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                    prefix={<SearchOutlined />}
                    placeholder="筛选当前结果"
                  />
                  <Button icon={<ReloadOutlined />} onClick={async () => await onReloadKey()}>
                    重新载入
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setItemOpen(true)}>
                    插入元素
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!selectedRow}
                    onClick={async () => {
                      if (!metadata || !selectedRow) {
                        return;
                      }
                      await onDeleteItem(buildDeletePayload(metadata.key, metadata.type, selectedRow));
                      await onReloadKey(metadata.key);
                      message.success("元素已删除");
                    }}
                  >
                    删除元素
                  </Button>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic title="当前" value={detail?.items.length ?? 0} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="总数" value={detail?.total ?? 0} />
                    </Col>
                  </Row>
                  <Button disabled={!detail?.hasMore || !detail.cursor} onClick={async () => {
                    if (!metadata || !detail?.cursor) {
                      return;
                    }
                    await onLoadMoreItems(metadata.key, detail.cursor);
                  }}>
                    {detail?.hasMore ? "加载更多" : "加载完成"}
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        ) : null}

        <Card
          title="编辑器"
          extra={
            <Space size={8}>
              <Text type="secondary">{editorAuxLabel}</Text>
              <Input
                value={editorAux}
                disabled={editorAuxReadonly}
                onChange={(event) => setEditorAux(event.target.value)}
                className="editor-aux-input"
              />
              <Tag>{metadata?.type === "json" ? "text/json" : "text/plain"}</Tag>
              <Button type="primary" icon={<SaveOutlined />} disabled={!metadata || metadata?.type === "stream"} onClick={async () => await handleSaveItem()}>
                保存
              </Button>
            </Space>
          }
        >
          <TextArea
            value={editorText}
            onChange={(event) => setEditorText(event.target.value)}
            rows={16}
            placeholder="选择键或元素后可在这里编辑。"
          />
        </Card>
      </div>

      <Modal
        title="新增键"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          const values = await createForm.validateFields();
          await onCreateKey(values);
          await onReloadKeys();
          setCreateOpen(false);
          createForm.resetFields();
          message.success("键已创建");
        }}
      >
        <Form form={createForm} layout="vertical" initialValues={{ keyType: "string", score: 0 }}>
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
            <InputNumber className="full-width" />
          </Form.Item>
          <Form.Item name="value" label="初始值">
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="插入元素"
        open={itemOpen}
        onCancel={() => setItemOpen(false)}
        onOk={async () => {
          if (!metadata) {
            return;
          }
          const values = await itemForm.validateFields();
          const payload = buildAddPayload(metadata.key, metadata.type, values);
          await onAddItem(payload);
          await onReloadKey(metadata.key);
          setItemOpen(false);
          itemForm.resetFields();
          message.success("元素已插入");
        }}
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="field" label="Field">
            <Input />
          </Form.Item>
          <Form.Item name="score" label="Score">
            <InputNumber className="full-width" />
          </Form.Item>
          <Form.Item name="streamFields" label="Stream 字段，格式 field=value,field=value">
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="value" label="Value">
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const buildSavePayload = (
  key: string,
  type: string,
  row: KeyRow,
  editorAux: string,
  editorText: string
): ItemSavePayload => {
  if (type === "hash" && row.rowType === "hash") {
    return {
      key,
      keyType: "hash",
      originalField: row.field,
      field: editorAux,
      value: editorText
    };
  }
  if (type === "list" && row.rowType === "list") {
    return {
      key,
      keyType: "list",
      index: row.index,
      value: editorText
    };
  }
  if (type === "set" && row.rowType === "set") {
    return {
      key,
      keyType: "set",
      originalValue: row.value,
      value: editorText
    };
  }
  if (type === "zset" && row.rowType === "zset") {
    return {
      key,
      keyType: "zset",
      originalValue: row.value,
      originalScore: row.score,
      value: editorText,
      score: Number(editorAux || row.score)
    };
  }
  return {
    key,
    keyType: "stream",
    entryId: row.rowType === "stream" ? row.entryId : undefined
  };
};

const buildDeletePayload = (key: string, type: string, row: KeyRow): ItemSavePayload => {
  if (type === "hash" && row.rowType === "hash") {
    return { key, keyType: "hash", originalField: row.field };
  }
  if (type === "list" && row.rowType === "list") {
    return { key, keyType: "list", index: row.index };
  }
  if (type === "set" && row.rowType === "set") {
    return { key, keyType: "set", originalValue: row.value };
  }
  if (type === "zset" && row.rowType === "zset") {
    return { key, keyType: "zset", originalValue: row.value };
  }
  return { key, keyType: "stream", entryId: row.rowType === "stream" ? row.entryId : undefined };
};

const buildAddPayload = (key: string, type: string, values: any): ItemAddPayload => {
  if (type === "hash") {
    return { key, keyType: "hash", field: values.field, value: values.value };
  }
  if (type === "list") {
    return { key, keyType: "list", value: values.value };
  }
  if (type === "set") {
    return { key, keyType: "set", value: values.value };
  }
  if (type === "zset") {
    return { key, keyType: "zset", value: values.value, score: values.score };
  }
  const streamFields = String(values.streamFields ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [field, ...rest] = item.split("=");
      return { field: field.trim(), value: rest.join("=").trim() };
    });
  return { key, keyType: "stream", streamFields };
};
