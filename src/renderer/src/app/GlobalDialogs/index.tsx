import type { ConnectionProfile, LogEntry } from "@shared/types";
import ConnectionManagerDialog from "@renderer/connection/ConnectionManagerDialog";
import ConnectionFormDialog from "@renderer/connection/ConnectionFormDialog";
import LogsModal from "@renderer/logs/LogsModal";
import { createEmptyProfile } from "@renderer/lib/theme";

interface GlobalDialogsProps {
  connectionManagerOpen: boolean;
  editingProfile: ConnectionProfile | null;
  logsOpen: boolean;
  logs: LogEntry[];
  connections: ConnectionProfile[];
  sessionsCount: number;
  onCloseManager: () => void;
  onOpenConnection: (profileId: string) => Promise<void>;
  onCreateConnection: () => void;
  onEditConnection: (profile: ConnectionProfile) => void;
  onDeleteConnection: (profile: ConnectionProfile) => Promise<void>;
  onCloseForm: () => void;
  onSaveConnection: (profile: ConnectionProfile) => Promise<void>;
  onCloseLogs: () => void;
  onClearLogs: () => Promise<void>;
}

export const GlobalDialogs = ({
  connectionManagerOpen,
  editingProfile,
  logsOpen,
  logs,
  connections,
  sessionsCount,
  onCloseManager,
  onOpenConnection,
  onCreateConnection,
  onEditConnection,
  onDeleteConnection,
  onCloseForm,
  onSaveConnection,
  onCloseLogs,
  onClearLogs
}: GlobalDialogsProps) => {
  return (
    <>
      <ConnectionManagerDialog
        open={connectionManagerOpen}
        connections={connections}
        canClose={sessionsCount > 0}
        onClose={onCloseManager}
        onOpen={onOpenConnection}
        onCreate={onCreateConnection}
        onEdit={onEditConnection}
        onDelete={onDeleteConnection}
      />

      <ConnectionFormDialog
        open={!!editingProfile}
        initialProfile={editingProfile ?? createEmptyProfile()}
        onClose={onCloseForm}
        onSave={onSaveConnection}
      />

      <LogsModal
        open={logsOpen}
        logs={logs}
        onClose={onCloseLogs}
        onClear={onClearLogs}
      />
    </>
  );
};

export default GlobalDialogs;
