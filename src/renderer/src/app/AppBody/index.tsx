import { App as AntApp, Layout, Tabs } from "antd";
import { useEffect, useState } from "react";
import type { ConnectionProfile } from "@shared/types";
import type { SessionViewState } from "@renderer/ui-types";
import { createEmptyProfile, createSessionState } from "@renderer/lib/theme";
import { useSessionManager } from "../useSessionManager";
import { useSessionData } from "../useSessionData";
import { useGlobalShortcuts } from "../useGlobalShortcuts";
import { buildTabItems } from "../useTabItems";
import SessionSider from "../SessionSider";
import SessionSummaryBar from "../SessionSummaryBar";
import EmptyState from "../EmptyState";
import GlobalDialogs from "../GlobalDialogs";
import styles from "./index.module.less";

const { Content } = Layout;

function AppBody() {
  const { message } = AntApp.useApp();
  const manager = useSessionManager();
  const {
    connections,
    sessions,
    views,
    activeSessionId,
    logs,
    setConnections,
    setSessions,
    setViews,
    setActiveSessionId,
    setLogs,
    setStatusMessage,
    setView,
    initializeSession
  } = manager;

  const [connectionManagerOpen, setConnectionManagerOpen] = useState(true);
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const isMac = navigator.userAgent.toLowerCase().includes("mac");
  const modKey = isMac ? "⌘" : "Ctrl";
  const shiftKey = isMac ? "⇧" : "Shift";

  const { refreshSessionMetrics, refreshSessionInfo, refreshKeys, refreshKeyDetails } =
    useSessionData({ views, setView, setStatusMessage });

  const activeSession = sessions.find((item) => item.sessionId === activeSessionId);
  const activeView = activeSession ? views[activeSession.sessionId] : undefined;

  useGlobalShortcuts(isMac, {
    onCreateConnection: () => setEditingProfile(createEmptyProfile()),
    onOpenManager: () => setConnectionManagerOpen(true)
  });

  const loadConnections = async () => {
    setConnections(await window.api.listConnections());
  };

  const loadLogs = async () => {
    setLogs(await window.api.listLogs());
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
      message.success("连接成功");
    } catch (error: any) {
      const msg = error?.message || String(error);
      setStatusMessage(`错误: ${msg}`);
      message.error({
        content: `连接失败: ${msg}`,
        key: "connection-error",
        duration: 4
      });
    }
  };

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

  useEffect(() => {
    const bootstrap = async () => {
      await loadConnections();
      const openSessions = await window.api.listSessions();
      setSessions(openSessions);
      setViews(
        Object.fromEntries(
          openSessions.map((session) => [session.sessionId, createSessionState(session)])
        )
      );
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
    if (activeView.keys.length === 0 && !activeView.loadingKeys && !activeView.keyComplete) {
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

  const tabItems = activeSession && activeView
    ? buildTabItems({
        session: activeSession,
        view: activeView,
        setView,
        refreshKeys,
        refreshKeyDetails,
        refreshSessionMetrics,
        onShowLogs: async () => {
          await loadLogs();
          setLogsOpen(true);
        }
      })
    : [];

  return (
    <Layout className={styles.layout}>
      <Layout className={styles.body}>
        {sessions.length > 0 && (
          <SessionSider
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onCloseSession={handleCloseSession}
            onOpenManager={() => setConnectionManagerOpen(true)}
          />
        )}

        <Content className={styles.mainContent}>
          {!activeSession || !activeView ? (
            <EmptyState modKey={modKey} shiftKey={shiftKey} />
          ) : (
            <div className={styles.contentStack}>
              <SessionSummaryBar
                session={activeSession}
                metrics={activeView.metrics}
                onShowLogs={async () => {
                  await loadLogs();
                  setLogsOpen(true);
                }}
              />
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
            </div>
          )}
        </Content>
      </Layout>

      <GlobalDialogs
        connectionManagerOpen={connectionManagerOpen}
        editingProfile={editingProfile}
        logsOpen={logsOpen}
        logs={logs}
        connections={connections}
        sessionsCount={sessions.length}
        onCloseManager={() => setConnectionManagerOpen(false)}
        onOpenConnection={openSessionByProfile}
        onCreateConnection={() => setEditingProfile(createEmptyProfile())}
        onEditConnection={(profile) => setEditingProfile(profile)}
        onDeleteConnection={handleDeleteConnection}
        onCloseForm={() => setEditingProfile(null)}
        onSaveConnection={handleSaveConnection}
        onCloseLogs={() => setLogsOpen(false)}
        onClearLogs={async () => {
          await window.api.clearLogs();
          await loadLogs();
        }}
      />
    </Layout>
  );
}

export default AppBody;
