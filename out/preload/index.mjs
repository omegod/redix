import { contextBridge, ipcRenderer } from "electron";
const api = {
  pickFile: async () => await ipcRenderer.invoke("app:pick-file"),
  listConnections: async () => await ipcRenderer.invoke("connections:list"),
  saveConnection: async (profile) => await ipcRenderer.invoke("connections:save", profile),
  deleteConnection: async (profileId) => await ipcRenderer.invoke("connections:delete", profileId),
  testConnection: async (profile) => await ipcRenderer.invoke("connections:test", profile),
  listSessions: async () => await ipcRenderer.invoke("sessions:list"),
  openSession: async (profileId) => await ipcRenderer.invoke("sessions:open", profileId),
  closeSession: async (sessionId) => await ipcRenderer.invoke("sessions:close", sessionId),
  getMetrics: async (sessionId) => await ipcRenderer.invoke("sessions:metrics", sessionId),
  getServerInfo: async (sessionId) => await ipcRenderer.invoke("sessions:info", sessionId),
  scanKeys: async (sessionId, request) => await ipcRenderer.invoke("redis:scan-keys", sessionId, request),
  getKeyDetails: async (sessionId, key, cursor) => await ipcRenderer.invoke("redis:key-details", sessionId, key, cursor),
  saveString: async (sessionId, key, value) => await ipcRenderer.invoke("redis:save-string", sessionId, key, value),
  renameKey: async (sessionId, key, newKey) => await ipcRenderer.invoke("redis:rename-key", sessionId, key, newKey),
  updateKeyTtl: async (sessionId, key, ttl) => await ipcRenderer.invoke("redis:update-ttl", sessionId, key, ttl),
  deleteKey: async (sessionId, key) => await ipcRenderer.invoke("redis:delete-key", sessionId, key),
  createKey: async (sessionId, payload) => await ipcRenderer.invoke("redis:create-key", sessionId, payload),
  addItem: async (sessionId, payload) => await ipcRenderer.invoke("redis:add-item", sessionId, payload),
  saveItem: async (sessionId, payload) => await ipcRenderer.invoke("redis:save-item", sessionId, payload),
  deleteItem: async (sessionId, payload) => await ipcRenderer.invoke("redis:delete-item", sessionId, payload),
  executeCommand: async (sessionId, input) => await ipcRenderer.invoke("redis:execute", sessionId, input),
  listLogs: async () => await ipcRenderer.invoke("logs:list"),
  clearLogs: async () => await ipcRenderer.invoke("logs:clear")
};
contextBridge.exposeInMainWorld("api", api);
