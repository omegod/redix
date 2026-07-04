import type { SessionViewState } from "@renderer/ui-types";

interface UseSessionDataParams {
  views: Record<string, SessionViewState>;
  setView: (sessionId: string, updater: (current: SessionViewState) => SessionViewState) => void;
  setStatusMessage: React.Dispatch<React.SetStateAction<string>>;
}

export const useSessionData = ({ views, setView, setStatusMessage }: UseSessionDataParams) => {
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

  return {
    refreshSessionMetrics,
    refreshSessionInfo,
    refreshKeys,
    refreshKeyDetails
  };
};
