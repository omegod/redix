import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { registerIpc } from "./ipc";
import { SessionService } from "./redis/session-service";
import { ConnectionStore } from "./store/connection-store";
import { LogStore } from "./store/log-store";

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 760,
    backgroundColor: "#3f4246",
    title: "RedisFront",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false
    }
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    await window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    return;
  }

  await window.loadFile(join(__dirname, "../renderer/index.html"));
};

app.whenReady().then(async () => {
  const logStore = new LogStore();
  const connectionStore = new ConnectionStore(app.getPath("userData"));
  const sessionService = new SessionService(logStore);

  registerIpc(connectionStore, sessionService, logStore);
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
