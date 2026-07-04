import { CodeOutlined, FolderOpenOutlined, InfoCircleOutlined } from "@ant-design/icons";
import type { TabsProps } from "antd";
import { Space } from "antd";
import type {
  CreateKeyPayload,
  ItemAddPayload,
  ItemSavePayload,
  SessionSummary
} from "@shared/types";
import type { SessionViewState } from "@renderer/ui-types";
import { makeId } from "@renderer/lib/theme";
import HomeTab from "@renderer/home/HomeTab";
import CommandTab from "@renderer/command/CommandTab";
import InfoTab from "@renderer/info/InfoTab";

interface UseTabItemsParams {
  session: SessionSummary;
  view: SessionViewState;
  setView: (sessionId: string, updater: (current: SessionViewState) => SessionViewState) => void;
  refreshKeys: (sessionId: string, append?: boolean, overrides?: { database?: number; search?: string; cursor?: string }) => Promise<void>;
  refreshKeyDetails: (sessionId: string, key: string, append?: boolean, cursorOverride?: string) => Promise<void>;
  refreshSessionMetrics: (sessionId: string) => Promise<void>;
  onShowLogs: () => Promise<void>;
}

export const buildTabItems = ({
  session,
  view,
  setView,
  refreshKeys,
  refreshKeyDetails,
  refreshSessionMetrics,
  onShowLogs
}: UseTabItemsParams): TabsProps["items"] => {
  return [
    {
      key: "home",
      label: (
        <Space size={6}>
          <FolderOpenOutlined />
          <span>主页</span>
        </Space>
      ),
      children: (
        <HomeTab
          session={session}
          state={view}
          onSearchChange={(value) => setView(session.sessionId, (current) => ({ ...current, search: value }))}
          onDatabaseChange={async (database) => {
            setView(session.sessionId, (current) => ({
              ...current,
              database,
              selectedKey: undefined,
              keyDetails: undefined,
              keys: [],
              keyCursor: undefined,
              keyComplete: false
            }));
            await refreshKeys(session.sessionId, false, {
              database,
              search: view.search
            });
          }}
          onReloadKeys={async () => await refreshKeys(session.sessionId, false)}
          onLoadMoreKeys={async () => await refreshKeys(session.sessionId, true)}
          onSelectKey={async (key) => await refreshKeyDetails(session.sessionId, key)}
          onReloadKey={async (key) => {
            const target = key ?? view.selectedKey;
            if (target) {
              await refreshKeyDetails(session.sessionId, target);
            }
          }}
          onLoadMoreItems={async (key, cursor) =>
            await refreshKeyDetails(session.sessionId, key, true, cursor)
          }
          onDeleteKey={async (key) => {
            await window.api.deleteKey(session.sessionId, key);
            setView(session.sessionId, (current) => ({
              ...current,
              selectedKey: undefined,
              keyDetails: undefined
            }));
            await refreshKeys(session.sessionId);
          }}
          onRenameKey={async (key, newKey) => {
            await window.api.renameKey(session.sessionId, key, newKey);
            setView(session.sessionId, (current) => ({ ...current, selectedKey: newKey }));
          }}
          onUpdateTtl={async (key, ttl) => {
            await window.api.updateKeyTtl(session.sessionId, key, ttl);
          }}
          onSaveString={async (key, value) => {
            await window.api.saveString(session.sessionId, key, value);
          }}
          onCreateKey={async (payload: CreateKeyPayload) => {
            await window.api.createKey(session.sessionId, payload);
            await refreshKeys(session.sessionId);
          }}
          onAddItem={async (payload: ItemAddPayload) => {
            await window.api.addItem(session.sessionId, payload);
          }}
          onSaveItem={async (payload: ItemSavePayload) => {
            await window.api.saveItem(session.sessionId, payload);
          }}
          onDeleteItem={async (payload: ItemSavePayload) => {
            await window.api.deleteItem(session.sessionId, payload);
          }}
        />
      )
    },
    {
      key: "command",
      label: (
        <Space size={6}>
          <CodeOutlined />
          <span>命令</span>
        </Space>
      ),
      children: (
        <CommandTab
          state={view}
          onShowLogs={onShowLogs}
          onExecute={async (input) => {
            const result = await window.api.executeCommand(session.sessionId, input);
            setView(session.sessionId, (current) => ({
              ...current,
              commands: [
                {
                  ...result,
                  id: makeId(),
                  createdAt: new Date().toISOString()
                },
                ...current.commands
              ]
            }));
            await refreshSessionMetrics(session.sessionId);
          }}
        />
      )
    },
    {
      key: "info",
      label: (
        <Space size={6}>
          <InfoCircleOutlined />
          <span>信息</span>
        </Space>
      ),
      children: <InfoTab state={view} info={view.info} />
    }
  ];
};
