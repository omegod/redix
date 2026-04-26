import { dialog, ipcMain } from "electron";
import type {
  ConnectionProfile,
  CreateKeyPayload,
  ItemAddPayload,
  ItemSavePayload,
  KeyScanRequest
} from "../shared/types";
import { SessionService } from "./redis/session-service";
import { ConnectionStore } from "./store/connection-store";
import { LogStore } from "./store/log-store";

const normalizeProfile = (profile: ConnectionProfile): ConnectionProfile => {
  const timestamp = new Date().toISOString();
  return {
    ...profile,
    createdAt: profile.createdAt || timestamp,
    updatedAt: timestamp
  };
};

export const registerIpc = (
  connectionStore: ConnectionStore,
  sessionService: SessionService,
  logStore: LogStore
) => {
  ipcMain.handle("app:pick-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"]
    });
    return result.canceled ? "" : result.filePaths[0] ?? "";
  });

  ipcMain.handle("connections:list", async () => connectionStore.list());
  ipcMain.handle("connections:save", async (_event, profile: ConnectionProfile) =>
    connectionStore.save(normalizeProfile(profile))
  );
  ipcMain.handle("connections:delete", async (_event, profileId: string) => {
    connectionStore.delete(profileId);
  });
  ipcMain.handle("connections:test", async (_event, profile: ConnectionProfile) =>
    sessionService.testConnection(normalizeProfile(profile))
  );

  ipcMain.handle("sessions:list", async () => sessionService.getOpenSessions());
  ipcMain.handle("sessions:open", async (_event, profileId: string) => {
    const profile = connectionStore.get(profileId);
    if (!profile) {
      throw new Error("Connection profile not found");
    }
    return await sessionService.openSession(profile);
  });
  ipcMain.handle("sessions:close", async (_event, sessionId: string) => {
    await sessionService.closeSession(sessionId);
  });
  ipcMain.handle("sessions:metrics", async (_event, sessionId: string) =>
    await sessionService.getMetrics(sessionId)
  );
  ipcMain.handle("sessions:info", async (_event, sessionId: string) =>
    await sessionService.getServerInfo(sessionId)
  );

  ipcMain.handle(
    "redis:scan-keys",
    async (_event, sessionId: string, request: KeyScanRequest) =>
      await sessionService.scanKeys(sessionId, request)
  );
  ipcMain.handle("redis:key-details", async (_event, sessionId: string, key: string, cursor?: string) =>
    await sessionService.getKeyDetails(sessionId, key, cursor)
  );
  ipcMain.handle("redis:save-string", async (_event, sessionId: string, key: string, value: string) =>
    await sessionService.saveString(sessionId, key, value)
  );
  ipcMain.handle("redis:rename-key", async (_event, sessionId: string, key: string, newKey: string) =>
    await sessionService.renameKey(sessionId, key, newKey)
  );
  ipcMain.handle("redis:update-ttl", async (_event, sessionId: string, key: string, ttl: number) =>
    await sessionService.updateKeyTtl(sessionId, key, ttl)
  );
  ipcMain.handle("redis:delete-key", async (_event, sessionId: string, key: string) =>
    await sessionService.deleteKey(sessionId, key)
  );
  ipcMain.handle("redis:create-key", async (_event, sessionId: string, payload: CreateKeyPayload) =>
    await sessionService.createKey(sessionId, payload)
  );
  ipcMain.handle("redis:add-item", async (_event, sessionId: string, payload: ItemAddPayload) =>
    await sessionService.addItem(sessionId, payload)
  );
  ipcMain.handle("redis:save-item", async (_event, sessionId: string, payload: ItemSavePayload) =>
    await sessionService.saveItem(sessionId, payload)
  );
  ipcMain.handle("redis:delete-item", async (_event, sessionId: string, payload: ItemSavePayload) =>
    await sessionService.deleteItem(sessionId, payload)
  );
  ipcMain.handle("redis:execute", async (_event, sessionId: string, input: string) =>
    await sessionService.executeCommand(sessionId, input)
  );

  ipcMain.handle("logs:list", async () => logStore.list());
  ipcMain.handle("logs:clear", async () => logStore.clear());
};

