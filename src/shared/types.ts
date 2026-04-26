export type RedisTopology = "standalone" | "cluster" | "sentinel";

export type RedisServerMode = "standalone" | "cluster" | "sentinel" | "unknown";

export type RedisKeyType =
  | "string"
  | "hash"
  | "list"
  | "set"
  | "zset"
  | "stream"
  | "json"
  | "none";

export interface TlsProfile {
  caPath: string;
  certPath: string;
  keyPath: string;
  passphrase: string;
}

export interface SshProfile {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  privateKeyPath: string;
}

export interface ConnectionProfile {
  id: string;
  title: string;
  topology: RedisTopology;
  host: string;
  port: number;
  username: string;
  password: string;
  database: number;
  ssl: boolean;
  clusterNodes: string[];
  sentinelNodes: string[];
  sentinelName: string;
  sentinelUsername: string;
  sentinelPassword: string;
  ssh: SshProfile;
  tls: TlsProfile;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  id: string;
  sessionId: string;
  endpoint: string;
  command: string;
  createdAt: string;
  status: "success" | "error";
  detail?: string;
}

export interface SessionSummary {
  sessionId: string;
  profileId: string;
  title: string;
  endpoint: string;
  topology: RedisTopology;
  serverMode: RedisServerMode;
  currentDatabase: number;
}

export interface SessionMetrics {
  keys: number;
  memory: string;
  opsPerSec: number;
  redisVersion: string;
  redisMode: string;
  clients: number;
}

export interface KeyScanRequest {
  pattern: string;
  cursor?: string;
  count?: number;
  database: number;
}

export interface KeyScanResult {
  keys: string[];
  cursor?: string;
  complete: boolean;
  database: number;
}

export interface KeyMetadata {
  key: string;
  type: RedisKeyType;
  ttl: number;
  length: number;
  sizeInBytes: number;
}

export interface HashRow {
  id: string;
  rowType: "hash";
  field: string;
  value: string;
  fieldLength: number;
  fieldSize: string;
  valueLength: number;
  valueSize: string;
}

export interface ListRow {
  id: string;
  rowType: "list";
  index: number;
  value: string;
  valueLength: number;
  valueSize: string;
}

export interface SetRow {
  id: string;
  rowType: "set";
  value: string;
  valueLength: number;
  valueSize: string;
}

export interface ZSetRow {
  id: string;
  rowType: "zset";
  score: number;
  value: string;
  valueLength: number;
  valueSize: string;
}

export interface StreamRow {
  id: string;
  rowType: "stream";
  entryId: string;
  value: Record<string, string>;
  fieldCount: number;
  valueSize: string;
}

export type KeyRow = HashRow | ListRow | SetRow | ZSetRow | StreamRow;

export interface KeyDetails {
  metadata: KeyMetadata;
  stringValue?: string;
  items: KeyRow[];
  cursor?: string;
  hasMore: boolean;
  total: number;
}

export interface ItemSavePayload {
  key: string;
  keyType: RedisKeyType;
  originalField?: string;
  field?: string;
  originalValue?: string;
  value?: string;
  index?: number;
  score?: number;
  originalScore?: number;
  entryId?: string;
}

export interface ItemAddPayload {
  key: string;
  keyType: RedisKeyType;
  field?: string;
  value?: string;
  score?: number;
  streamFields?: Array<{ field: string; value: string }>;
}

export interface CreateKeyPayload {
  key: string;
  keyType: RedisKeyType;
  value?: string;
  field?: string;
  score?: number;
}

export interface ServerInfoPayload {
  metrics: SessionMetrics;
  sections: Record<string, Record<string, string>>;
}

export interface CommandResult {
  command: string;
  output: string;
}

