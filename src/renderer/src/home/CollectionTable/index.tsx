import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { KeyRow } from "@shared/types";
import styles from "./index.module.less";

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

interface CollectionTableProps {
  rows: KeyRow[];
  selectedRowId: string;
  sampleRow?: KeyRow;
  onSelectRow: (id: string) => void;
}

export const CollectionTable = ({
  rows,
  selectedRowId,
  sampleRow,
  onSelectRow
}: CollectionTableProps) => {
  return (
    <div className={styles.collectionTable}>
      <Table<KeyRow>
        size="small"
        rowKey="id"
        dataSource={rows}
        columns={buildColumns(sampleRow)}
        pagination={false}
        style={{ minHeight: 130 }}
        scroll={{ y: 130 }}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedRowId ? [selectedRowId] : [],
          onChange: (keys) => onSelectRow(String(keys[0] ?? ""))
        }}
      />
    </div>
  );
};

export default CollectionTable;
