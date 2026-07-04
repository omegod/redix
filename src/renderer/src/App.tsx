import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useMemo, useState } from "react";
import { themeConfig } from "@renderer/lib/theme";
import AppBody from "@renderer/app/AppBody";

export default function App() {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("light");
  const [systemIsDark, setSystemIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    window.api.onThemeChange((mode) => {
      setThemeMode(mode);
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === "system") return systemIsDark;
    return themeMode === "dark";
  }, [themeMode, systemIsDark]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <ConfigProvider theme={themeConfig(isDark)} locale={zhCN}>
      <AntApp>
        <AppBody />
      </AntApp>
    </ConfigProvider>
  );
}
