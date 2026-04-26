import type {
  CommandResult,
  KeyDetails,
  ServerInfoPayload,
  SessionMetrics
} from "../../shared/types";

export type InnerTab = "home" | "command" | "info";

export interface SessionViewState {
  activeTab: InnerTab;
  database: number;
  search: string;
  keys: string[];
  keyCursor?: string;
  keyComplete: boolean;
  selectedKey?: string;
  keyDetails?: KeyDetails;
  loadingKeys: boolean;
  loadingKey: boolean;
  metrics?: SessionMetrics;
  info?: ServerInfoPayload;
  commands: Array<
    CommandResult & {
      id: string;
      createdAt: string;
    }
  >;
}
