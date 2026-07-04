import { useState } from "react";
import type {
  ConnectionProfile,
  LogEntry,
  SessionSummary
} from "@shared/types";
import type { SessionViewState } from "@renderer/ui-types";
import { createSessionState } from "@renderer/lib/theme";

export interface SessionManagerState {
  connections: ConnectionProfile[];
  sessions: SessionSummary[];
  views: Record<string, SessionViewState>;
  activeSessionId: string;
  logs: LogEntry[];
  statusMessage: string;
  setConnections: React.Dispatch<React.SetStateAction<ConnectionProfile[]>>;
  setSessions: React.Dispatch<React.SetStateAction<SessionSummary[]>>;
  setViews: React.Dispatch<React.SetStateAction<Record<string, SessionViewState>>>;
  setActiveSessionId: React.Dispatch<React.SetStateAction<string>>;
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  setStatusMessage: React.Dispatch<React.SetStateAction<string>>;
  setView: (sessionId: string, updater: (current: SessionViewState) => SessionViewState) => void;
  initializeSession: (session: SessionSummary) => void;
}

export const useSessionManager = (): SessionManagerState => {
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [views, setViews] = useState<Record<string, SessionViewState>>({});
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState("准备就绪");

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

  const initializeSession = (session: SessionSummary) => {
    setViews((current) => ({
      ...current,
      [session.sessionId]: current[session.sessionId] ?? createSessionState(session)
    }));
  };

  return {
    connections,
    sessions,
    views,
    activeSessionId,
    logs,
    statusMessage,
    setConnections,
    setSessions,
    setViews,
    setActiveSessionId,
    setLogs,
    setStatusMessage,
    setView,
    initializeSession
  };
};
