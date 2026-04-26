import {
  CodeOutlined,
  DatabaseOutlined,
  DisconnectOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  App as AntApp,
  Button,
  Card,
  ConfigProvider,
  Layout,
  Menu,
  Space,
  Tabs,
  Tag,
  Typography
} from "antd";
import type { MenuProps, TabsProps, ThemeConfig } from "antd";
import { useEffect, useMemo, useState } from "react";
import type {
  ConnectionProfile,
  CreateKeyPayload,
  ItemAddPayload,
  ItemSavePayload,
  LogEntry,
  SessionSummary
} from "../../shared/types";
import { CommandTab } from "./components/CommandTab";
import { ConnectionFormDialog, ConnectionManagerDialog } from "./components/ConnectionDialogs";
import { HomeTab } from "./components/HomeTab";
import { InfoTab } from "./components/InfoTab";
import { LogsModal } from "./components/LogsModal";
import type { SessionViewState } from "./ui-types";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const createEmptyProfile = (): ConnectionProfile => ({
  id: "",
  title: "",
  topology: "standalone",
  host: "127.0.0.1",
  port: 6379,
  username: "",
  password: "",
  database: 0,
  ssl: false,
  clusterNodes: [],
  sentinelNodes: [],
  sentinelName: "mymaster",
  sentinelUsername: "",
  sentinelPassword: "",
  ssh: {
    enabled: false,
    host: "",
    port: 22,
    username: "",
    password: "",
    privateKeyPath: ""
  },
  tls: {
    caPath: "",
    certPath: "",
    keyPath: "",
    passphrase: ""
  },
  createdAt: "",
  updatedAt: ""
});

const createSessionState = (session: SessionSummary): SessionViewState => ({
  activeTab: "home",
  database: session.currentDatabase,
  search: "",
  keys: [],
  keyComplete: false,
  loadingKeys: false,
  loadingKey: false,
  commands: []
});

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: "#d84a1b",
    colorBgLayout: "#f5f7fa",
    colorBgContainer: "#ffffff",
    colorBorderSecondary: "#e8edf3",
    borderRadius: 10,
    fontSize: 14
  },
  components: {
    Button: {
      controlHeight: 34,
      fontSize: 14
    },
    Input: {
      controlHeight: 34,
      fontSize: 14
    },
    Select: {
      controlHeight: 34,
      fontSize: 14
    },
    InputNumber: {
      controlHeight: 34,
      fontSize: 14
    },
    Tabs: {
      titleFontSize: 14
    },
    Table: {
      fontSize: 12
    },
    Statistic: {
      contentFontSize: 16,
      titleFontSize: 12
    },
    Modal: {
      titleFontSize: 16
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0
    }
  }
};

function AppBody() {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [views, setViews] = useState<Record<string, SessionViewState>>({});
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [connectionManagerOpen, setConnectionManagerOpen] = useState(true);
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState("准备就绪");

  const activeSession = sessions.find((item) => item.sessionId === activeSessionId);
  const activeView = activeSession ? views[activeSession.sessionId] : undefined;

  const setView = (sessionId: string, updater: (current: SessionViewState) => SessionViewState) => {
    setViews((current) => {
      const base = current[sessionId];
      if (!base) {
        return current;
      }
      return {
        ...current,
        [sessionId]: updater(base)
      };
    });
  };

  const loadConnections = async () => {
    setConnections(await window.api.listConnections());
  };

  const loadLogs = async () => {
    setLogs(await window.api.listLogs());
  };

  const refreshSessionMetrics = async (sessionId: string) => {
    const metrics = await window.api.getMetrics(sessionId);
    setView(sessionId, (current) => ({ ...current, metrics }));
  };

  const refreshSessionInfo = async (sessionId: string) => {
    const info = await window.api.getServerInfo(sessionId);
    setView(sessionId, (current) => ({ ...current, info }));
  };

  const refreshKeys = async (
    sessionId: string,
    append = false,
    overrides?: { database?: number; search?: string; cursor?: string }
  ) => {
    const view = views[sessionId];
    if (!view) {
      return;
    }
    setView(sessionId, (current) => ({ ...current, loadingKeys: true }));
    try {
      const result = await window.api.scanKeys(sessionId, {
        pattern: (overrides?.search ?? view.search).trim() || "*",
        cursor: append ? overrides?.cursor ?? view.keyCursor : undefined,
        count: 500,
        database: overrides?.database ?? view.database
      });
      setView(sessionId, (current) => ({
        ...current,
        keys: append ? [...current.keys, ...result.keys] : result.keys,
        keyCursor: result.cursor,
        keyComplete: result.complete,
        loadingKeys: false
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
      setView(sessionId, (current) => ({ ...current, loadingKeys: false }));
    }
  };

  const refreshKeyDetails = async (
    sessionId: string,
    key: string,
    append = false,
    cursorOverride?: string
  ) => {
    const view = views[sessionId];
    if (!view) {
      return;
    }
    setView(sessionId, (current) => ({
      ...current,
      selectedKey: key,
      loadingKey: true
    }));
    try {
      const result = await window.api.getKeyDetails(
        sessionId,
        key,
        append ? cursorOverride ?? view.keyDetails?.cursor : undefined
      );
      setView(sessionId, (current) => ({
        ...current,
        selectedKey: key,
        keyDetails:
          append && current.keyDetails
            ? {
                ...result,
                items: [...current.keyDetails.items, ...result.items]
              }
            : result,
        loadingKey: false
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
      setView(sessionId, (current) => ({ ...current, loadingKey: false }));
    }
  };

  const initializeSession = (session: SessionSummary) => {
    setViews((current) => ({
      ...current,
      [session.sessionId]: current[session.sessionId] ?? createSessionState(session)
    }));
  };

  const openSessionByProfile = async (profileId: string) => {
    const existing = sessions.find((item) => item.profileId === profileId);
    if (existing) {
      setActiveSessionId(existing.sessionId);
      setConnectionManagerOpen(false);
      return;
    }

    try {
      setStatusMessage("打开连接中...");
      const session = await window.api.openSession(profileId);
      setSessions((current) => [...current, session]);
      initializeSession(session);
      setActiveSessionId(session.sessionId);
      setConnectionManagerOpen(false);
      setStatusMessage(`已连接 ${session.endpoint}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await loadConnections();
      const openSessions = await window.api.listSessions();
      setSessions(openSessions);
      setViews(Object.fromEntries(openSessions.map((session) => [session.sessionId, createSessionState(session)])));
      if (openSessions[0]) {
        setActiveSessionId(openSessions[0].sessionId);
        setConnectionManagerOpen(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const session = sessions.find((item) => item.sessionId === activeSessionId);
    if (!session) {
      return;
    }

    if (!views[session.sessionId]) {
      initializeSession(session);
      return;
    }

    void refreshSessionMetrics(session.sessionId);
    void refreshSessionInfo(session.sessionId);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (!activeSessionId || !activeView) {
      return;
    }
    if (activeView.keys.length === 0 && !activeView.loadingKeys) {
      void refreshKeys(activeSessionId);
    }
  }, [activeSessionId, activeView?.keys.length, activeView?.loadingKeys]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshSessionMetrics(activeSessionId);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeSessionId]);

  const handleCloseSession = async (sessionId: string) => {
    await window.api.closeSession(sessionId);
    const nextSessions = sessions.filter((item) => item.sessionId !== sessionId);
    setSessions(nextSessions);
    setViews((current) => {
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
    setActiveSessionId(nextSessions[0]?.sessionId ?? "");
    if (nextSessions.length === 0) {
      setConnectionManagerOpen(true);
    }
  };

  const handleSaveConnection = async (profile: ConnectionProfile) => {
    const payload = {
      ...profile,
      id: profile.id || crypto.randomUUID()
    };
    await window.api.saveConnection(payload);
    await loadConnections();
    setStatusMessage(`已保存连接 ${payload.title}`);
  };

  const handleDeleteConnection = async (profile: ConnectionProfile) => {
    await window.api.deleteConnection(profile.id);
    await loadConnections();
  };

  const menuItems: MenuProps["items"] = sessions.map((session) => ({
    key: session.sessionId,
    icon: <DatabaseOutlined />,
    label: (
      <div className="session-menu-label">
        <span className="session-menu-title">{session.title}</span>
        <Button
          type="text"
          size="small"
          icon={<DisconnectOutlined />}
          onClick={async (event) => {
            event.stopPropagation();
            await handleCloseSession(session.sessionId);
          }}
        />
      </div>
    )
  }));

  const tabItems: TabsProps["items"] = activeSession && activeView
    ? [
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
              session={activeSession}
              state={activeView}
              onSearchChange={(value) => setView(activeSession.sessionId, (current) => ({ ...current, search: value }))}
              onDatabaseChange={async (database) => {
                setView(activeSession.sessionId, (current) => ({
                  ...current,
                  database,
                  selectedKey: undefined,
                  keyDetails: undefined,
                  keys: [],
                  keyCursor: undefined,
                  keyComplete: false
                }));
                await refreshKeys(activeSession.sessionId, false, {
                  database,
                  search: views[activeSession.sessionId]?.search ?? ""
                });
              }}
              onReloadKeys={async () => await refreshKeys(activeSession.sessionId, false)}
              onLoadMoreKeys={async () => await refreshKeys(activeSession.sessionId, true)}
              onSelectKey={async (key) => await refreshKeyDetails(activeSession.sessionId, key)}
              onReloadKey={async (key) => {
                const target = key ?? views[activeSession.sessionId]?.selectedKey;
                if (target) {
                  await refreshKeyDetails(activeSession.sessionId, target);
                }
              }}
              onLoadMoreItems={async (key, cursor) =>
                await refreshKeyDetails(activeSession.sessionId, key, true, cursor)
              }
              onDeleteKey={async (key) => {
                await window.api.deleteKey(activeSession.sessionId, key);
                setView(activeSession.sessionId, (current) => ({
                  ...current,
                  selectedKey: undefined,
                  keyDetails: undefined
                }));
                await refreshKeys(activeSession.sessionId);
              }}
              onRenameKey={async (key, newKey) => {
                await window.api.renameKey(activeSession.sessionId, key, newKey);
                setView(activeSession.sessionId, (current) => ({ ...current, selectedKey: newKey }));
              }}
              onUpdateTtl={async (key, ttl) => {
                await window.api.updateKeyTtl(activeSession.sessionId, key, ttl);
              }}
              onSaveString={async (key, value) => {
                await window.api.saveString(activeSession.sessionId, key, value);
              }}
              onCreateKey={async (payload: CreateKeyPayload) => {
                await window.api.createKey(activeSession.sessionId, payload);
                await refreshKeys(activeSession.sessionId);
              }}
              onAddItem={async (payload: ItemAddPayload) => {
                await window.api.addItem(activeSession.sessionId, payload);
              }}
              onSaveItem={async (payload: ItemSavePayload) => {
                await window.api.saveItem(activeSession.sessionId, payload);
              }}
              onDeleteItem={async (payload: ItemSavePayload) => {
                await window.api.deleteItem(activeSession.sessionId, payload);
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
              state={activeView}
              onExecute={async (input) => {
                const result = await window.api.executeCommand(activeSession.sessionId, input);
                setView(activeSession.sessionId, (current) => ({
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
                await refreshSessionMetrics(activeSession.sessionId);
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
          children: <InfoTab state={activeView} info={activeView.info} />
        }
      ]
    : [];

  return (
    <Layout className="app-layout">
      <Header className="app-topbar">
        <div className="topbar-brand">
          <Space size={10}>
            <DatabaseOutlined />
            <Title level={5}>RedisFront</Title>
          </Space>
          <Text type="secondary">{statusMessage}</Text>
        </div>
        <Space size={8}>
          <Button icon={<HistoryOutlined />} onClick={async () => {
            await loadLogs();
            setLogsOpen(true);
          }}>
            命令记录
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setConnectionManagerOpen(true)}>
            打开连接
          </Button>
        </Space>
      </Header>

      <Layout>
        <Sider width={240} className="session-sider">
          <Card
            title="连接会话"
            extra={<Tag color="orange">{sessions.length}</Tag>}
            bodyStyle={{ padding: 8 }}
            className="session-sider-card"
          >
            <Menu
              mode="inline"
              selectedKeys={activeSessionId ? [activeSessionId] : []}
              items={menuItems}
              onClick={({ key }) => setActiveSessionId(String(key))}
            />
          </Card>
        </Sider>

        <Content className="main-content">
          {!activeSession || !activeView ? (
            <Card className="empty-card">
              <Space direction="vertical" size={8}>
                <Title level={5}>暂无打开的连接</Title>
                <Text type="secondary">使用“打开连接”创建并连接 Redis。</Text>
              </Space>
            </Card>
          ) : (
            <Space direction="vertical" size={12} className="content-stack">
              <Card className="session-summary-card">
                <Space size={12} wrap>
                  <Tag color="blue">{activeSession.serverMode}</Tag>
                  <Text>{activeSession.endpoint}</Text>
                  <Text type="secondary">Key 数量: {activeView.metrics?.keys ?? 0}</Text>
                  <Text type="secondary">每秒命令数: {activeView.metrics?.opsPerSec ?? 0}</Text>
                  <Text type="secondary">内存使用: {activeView.metrics?.memory ?? "-"}</Text>
                </Space>
              </Card>

              <Tabs
                activeKey={activeView.activeTab}
                items={tabItems}
                onChange={(value) =>
                  setView(activeSession.sessionId, (current) => ({
                    ...current,
                    activeTab: value as SessionViewState["activeTab"]
                  }))
                }
              />
            </Space>
          )}
        </Content>
      </Layout>

      <ConnectionManagerDialog
        open={connectionManagerOpen}
        connections={connections}
        canClose={sessions.length > 0}
        onClose={() => setConnectionManagerOpen(false)}
        onOpen={openSessionByProfile}
        onCreate={() => setEditingProfile(createEmptyProfile())}
        onEdit={(profile) => setEditingProfile(profile)}
        onDelete={handleDeleteConnection}
      />

      <ConnectionFormDialog
        open={!!editingProfile}
        initialProfile={editingProfile ?? createEmptyProfile()}
        onClose={() => setEditingProfile(null)}
        onSave={handleSaveConnection}
      />

      <LogsModal
        open={logsOpen}
        logs={logs}
        onClose={() => setLogsOpen(false)}
        onClear={async () => {
          await window.api.clearLogs();
          await loadLogs();
        }}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>
        <AppBody />
      </AntApp>
    </ConfigProvider>
  );
}
