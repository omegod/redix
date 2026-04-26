import { app, BrowserWindow, Menu } from "electron";
import { join } from "node:path";
import { registerIpc } from "./ipc";
import { SessionService } from "./redis/session-service";
import { ConnectionStore } from "./store/connection-store";
import { LogStore } from "./store/log-store";

// 强制设置 App 名称
app.setName("Redix");

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#f5f7fa",
    show: false,
    title: "Redix",
    icon: join(__dirname, "../../resources/icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false
    }
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  // macOS 菜单栏特殊处理：强制显示 Redix
  if (process.platform === "darwin") {
    const template = [
      {
        label: "Redix", // 这里硬编码名称
        submenu: [
          { role: "about", label: "关于 Redix" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide", label: "隐藏 Redix" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit", label: "退出 Redix" }
        ]
      },
      {
        label: "编辑",
        submenu: [
          { role: "undo", label: "撤销" },
          { role: "redo", label: "重做" },
          { type: "separator" },
          { role: "cut", label: "剪切" },
          { role: "copy", label: "复制" },
          { role: "paste", label: "粘贴" },
          { role: "selectAll", label: "全选" }
        ]
      },
      {
        label: "视图",
        submenu: [
          { role: "reload", label: "强制刷新" },
          { role: "toggleDevTools", label: "开发者工具" },
          { type: "separator" },
          { role: "resetZoom", label: "实际大小" },
          { role: "zoomIn", label: "放大" },
          { role: "zoomOut", label: "缩小" },
          { type: "separator" },
          { role: "togglefullscreen", label: "全屏" }
        ]
      }
    ];
    // @ts-ignore
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  if (process.env["ELECTRON_RENDERER_URL"]) {
    await window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    window.webContents.openDevTools();
    return;
  }

  await window.loadFile(join(__dirname, "../renderer/index.html"));
};

app.whenReady().then(async () => {
  const logStore = new LogStore();
  const connectionStore = new ConnectionStore(app.getPath("userData"));
  const sessionService = new SessionService(logStore);

  // 设置 macOS Dock 图标
  if (process.platform === "darwin") {
    app.dock.setIcon(join(__dirname, "../../resources/icon.png"));
  }

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
