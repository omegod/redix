import type { ItemAddPayload, ItemSavePayload, KeyRow } from "@shared/types";

export const isJsonLike = (value: string) => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const prettyJson = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

export interface EditorDraft {
  aux: string;
  auxLabel: string;
  text: string;
  readOnlyAux: boolean;
}

export const rowEditorState = (row: KeyRow): EditorDraft => {
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

export const rowContains = (row: KeyRow, keyword: string) => {
  const normalized = keyword.toLowerCase();
  if (row.rowType === "hash") {
    return row.field.toLowerCase().includes(normalized) || row.value.toLowerCase().includes(normalized);
  }
  if (row.rowType === "list" || row.rowType === "set" || row.rowType === "zset") {
    return row.value.toLowerCase().includes(normalized);
  }
  return JSON.stringify(row.value).toLowerCase().includes(normalized);
};

export const buildSavePayload = (
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

export const buildAddPayload = (key: string, type: string, values: any): ItemAddPayload => {
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
