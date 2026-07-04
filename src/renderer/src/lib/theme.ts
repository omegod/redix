import type { ThemeConfig } from "antd";
import { theme } from "antd";
import type { ConnectionProfile, SessionSummary } from "@shared/types";
import type { SessionViewState } from "@renderer/ui-types";

export const createEmptyProfile = (): ConnectionProfile => ({
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

export const createSessionState = (session: SessionSummary): SessionViewState => ({
  activeTab: "home",
  database: session.currentDatabase,
  search: "",
  keys: [],
  keyComplete: false,
  loadingKeys: false,
  loadingKey: false,
  commands: []
});

export const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const themeConfig = (isDark: boolean): ThemeConfig => ({
  algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: "#d84a1b",
    colorBgLayout: isDark ? "#141414" : "#f5f7fa",
    colorBgContainer: isDark ? "#1f1f1f" : "#ffffff",
    colorBorderSecondary: isDark ? "#303030" : "#e8edf3",
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
});
