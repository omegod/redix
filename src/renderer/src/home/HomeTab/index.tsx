import { App, Card } from "antd";
import { useState } from "react";
import type {
  CreateKeyPayload,
  ItemAddPayload,
  ItemSavePayload,
  SessionSummary
} from "@shared/types";
import type { SessionViewState } from "@renderer/ui-types";
import { buildSavePayload } from "@renderer/lib/payload";
import shared from "@renderer/styles/shared.module.less";
import KeyToolbar from "../KeyToolbar";
import KeySearch from "../KeySearch";
import KeyTreePanel from "../KeyTreePanel";
import KeyDetailHeader from "../KeyDetailHeader";
import ValueEditor from "../ValueEditor";
import CreateKeyModal from "../CreateKeyModal";
import InsertItemModal from "../InsertItemModal";
import { useEditorDraft } from "../useEditorDraft";
import styles from "./index.module.less";

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
  const { message } = App.useApp();
  const [itemSearch, setItemSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);

  const detail = state.keyDetails;
  const metadata = detail?.metadata;
  const draft = useEditorDraft(detail);
  const selectedRow = detail?.items.find((row) => row.id === draft.selectedRowId);

  const handleSaveTop = async () => {
    if (!metadata) {
      return;
    }

    setSaving(true);
    try {
      let currentKey = metadata.key;
      if (draft.keyName.trim() && draft.keyName !== metadata.key) {
        await onRenameKey(metadata.key, draft.keyName.trim());
        currentKey = draft.keyName.trim();
      }
      if (draft.ttlValue !== metadata.ttl) {
        await onUpdateTtl(currentKey, draft.ttlValue);
      }
      if (metadata.type === "string" || metadata.type === "json") {
        await onSaveString(currentKey, draft.editorText);
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
      await onSaveString(metadata.key, draft.editorText);
      await onReloadKey(metadata.key);
      message.success("已保存");
      return;
    }
    if (!selectedRow) {
      return;
    }

    const payload = buildSavePayload(
      metadata.key,
      metadata.type,
      selectedRow,
      draft.editorAux,
      draft.editorText
    );
    await onSaveItem(payload);
    await onReloadKey(metadata.key);
    message.success("元素已更新");
  };

  return (
    <div className={styles.layout}>
      <Card className={`${shared.cardBase} ${styles.sidebarCard}`} bodyStyle={{ padding: 12 }}>
        <div className={styles.sidebarStack}>
          <KeyToolbar
            database={state.database}
            topology={session.topology}
            onDatabaseChange={onDatabaseChange}
            onReloadKeys={onReloadKeys}
            onCreateKey={() => setCreateOpen(true)}
            onFlushDb={async () => {
              await window.api.executeCommand(session.sessionId, "FLUSHDB");
              await onReloadKeys();
            }}
          />

          <KeySearch
            value={state.search}
            onChange={onSearchChange}
            onSearch={onReloadKeys}
          />

          <KeyTreePanel
            keys={state.keys}
            selectedKey={state.selectedKey}
            loadingKeys={state.loadingKeys}
            keyComplete={state.keyComplete}
            onSelectKey={onSelectKey}
            onLoadMoreKeys={onLoadMoreKeys}
          />
        </div>
      </Card>

      <div className={styles.detailStack}>
        <KeyDetailHeader
          detail={detail}
          metadata={metadata}
          keyName={draft.keyName}
          ttlValue={draft.ttlValue}
          saving={saving}
          itemSearch={itemSearch}
          selectedRowId={draft.selectedRowId}
          onKeyNameChange={draft.setKeyName}
          onTtlChange={draft.setTtlValue}
          setSelectedRowId={draft.setSelectedRowId}
          onDelete={async () => {
            if (metadata) {
              await onDeleteKey(metadata.key);
            }
          }}
          onReload={async () => await onReloadKey()}
          onSave={handleSaveTop}
        />

        <ValueEditor
          metadata={metadata}
          text={draft.editorText}
          aux={draft.editorAux}
          auxLabel={draft.editorAuxLabel}
          auxReadOnly={draft.editorAuxReadonly}
          onTextChange={draft.setEditorText}
          onAuxChange={draft.setEditorAux}
          onSave={handleSaveItem}
          onAddItem={() => setItemOpen(true)}
        />
      </div>

      <CreateKeyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreateKey}
        onReloadKeys={onReloadKeys}
      />

      <InsertItemModal
        open={itemOpen}
        metadata={metadata}
        onClose={() => setItemOpen(false)}
        onAdd={onAddItem}
        onReloadKey={onReloadKey}
      />
    </div>
  );
};

export default HomeTab;
