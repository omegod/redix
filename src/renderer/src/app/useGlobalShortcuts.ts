import { useEffect } from "react";

interface ShortcutHandlers {
  onCreateConnection: () => void;
  onOpenManager: () => void;
}

export const useGlobalShortcuts = (isMac: boolean, handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      const shift = event.shiftKey;

      if (mod && shift) {
        if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          handlers.onCreateConnection();
        } else if (event.key.toLowerCase() === "o") {
          event.preventDefault();
          handlers.onOpenManager();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMac, handlers]);
};
