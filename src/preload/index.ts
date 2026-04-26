import { contextBridge, ipcRenderer } from "electron";
import type {
  CommandResult,
  ConnectionProfile,
  CreateKeyPayload,
  ItemAddPayload,
  ItemSavePayload,
  KeyDetails,
  KeyScanRequest,
  KeyScanResult,
  LogEntry,
  ServerInfoPayload,
  SessionMetrics,
  SessionSummary
} from "../shared/types";

const api = {
  pickFile: async (): Promise<string> => await ipcRenderer.invoke("app:pick-file"),
  listConnections: async (): Promise<ConnectionProfile[]> =>
    await ipcRenderer.invoke("connections:list"),
  saveConnection: async (profile: ConnectionProfile): Promise<ConnectionProfile> =>
    await ipcRenderer.invoke("connections:save", profile),
  deleteConnection: async (profileId: string): Promise<void> =>
    await ipcRenderer.invoke("connections:delete", profileId),
  testConnection: async (profile: ConnectionProfile): Promise<SessionSummary> =>
    await ipcRenderer.invoke("connections:test", profile),
  listSessions: async (): Promise<SessionSummary[]> => await ipcRenderer.invoke("sessions:list"),
  openSession: async (profileId: string): Promise<SessionSummary> =>
    await ipcRenderer.invoke("sessions:open", profileId),
  closeSession: async (sessionId: string): Promise<void> =>
    await ipcRenderer.invoke("sessions:close", sessionId),
  getMetrics: async (sessionId: string): Promise<SessionMetrics> =>
    await ipcRenderer.invoke("sessions:metrics", sessionId),
  getServerInfo: async (sessionId: string): Promise<ServerInfoPayload> =>
    await ipcRenderer.invoke("sessions:info", sessionId),
  scanKeys: async (sessionId: string, request: KeyScanRequest): Promise<KeyScanResult> =>
    await ipcRenderer.invoke("redis:scan-keys", sessionId, request),
  getKeyDetails: async (
    sessionId: string,
    key: string,
    cursor?: string
  ): Promise<KeyDetails> => await ipcRenderer.invoke("redis:key-details", sessionId, key, cursor),
  saveString: async (sessionId: string, key: string, value: string): Promise<void> =>
    await ipcRenderer.invoke("redis:save-string", sessionId, key, value),
  renameKey: async (sessionId: string, key: string, newKey: string): Promise<void> =>
    await ipcRenderer.invoke("redis:rename-key", sessionId, key, newKey),
  updateKeyTtl: async (sessionId: string, key: string, ttl: number): Promise<void> =>
    await ipcRenderer.invoke("redis:update-ttl", sessionId, key, ttl),
  deleteKey: async (sessionId: string, key: string): Promise<void> =>
    await ipcRenderer.invoke("redis:delete-key", sessionId, key),
  createKey: async (sessionId: string, payload: CreateKeyPayload): Promise<void> =>
    await ipcRenderer.invoke("redis:create-key", sessionId, payload),
  addItem: async (sessionId: string, payload: ItemAddPayload): Promise<void> =>
    await ipcRenderer.invoke("redis:add-item", sessionId, payload),
  saveItem: async (sessionId: string, payload: ItemSavePayload): Promise<void> =>
    await ipcRenderer.invoke("redis:save-item", sessionId, payload),
  deleteItem: async (sessionId: string, payload: ItemSavePayload): Promise<void> =>
    await ipcRenderer.invoke("redis:delete-item", sessionId, payload),
  executeCommand: async (sessionId: string, input: string): Promise<CommandResult> =>
    await ipcRenderer.invoke("redis:execute", sessionId, input),
  listLogs: async (): Promise<LogEntry[]> => await ipcRenderer.invoke("logs:list"),
  clearLogs: async (): Promise<void> => await ipcRenderer.invoke("logs:clear"),
  onThemeChange: (callback: (mode: "light" | "dark" | "system") => void) =>
    ipcRenderer.on("theme:change", (_event, mode) => callback(mode))
};

contextBridge.exposeInMainWorld("api", api);

export type RedixApi = typeof api;

