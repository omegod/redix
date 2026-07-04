import { useEffect, useState } from "react";
import type { KeyDetails } from "@shared/types";
import { prettyJson, rowEditorState } from "@renderer/lib/payload";

export interface EditorDraftState {
  keyName: string;
  ttlValue: number;
  editorText: string;
  editorAux: string;
  editorAuxLabel: string;
  editorAuxReadonly: boolean;
  selectedRowId: string;
  setKeyName: (value: string) => void;
  setTtlValue: (value: number) => void;
  setEditorText: (value: string) => void;
  setEditorAux: (value: string) => void;
  setSelectedRowId: (value: string) => void;
}

export const useEditorDraft = (detail: KeyDetails | undefined): EditorDraftState => {
  const [keyName, setKeyName] = useState("");
  const [ttlValue, setTtlValue] = useState(-1);
  const [editorText, setEditorText] = useState("");
  const [editorAux, setEditorAux] = useState("");
  const [editorAuxLabel, setEditorAuxLabel] = useState("键名");
  const [editorAuxReadonly, setEditorAuxReadonly] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string>("");

  const metadata = detail?.metadata;

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

  return {
    keyName,
    ttlValue,
    editorText,
    editorAux,
    editorAuxLabel,
    editorAuxReadonly,
    selectedRowId,
    setKeyName,
    setTtlValue,
    setEditorText,
    setEditorAux,
    setSelectedRowId
  };
};
