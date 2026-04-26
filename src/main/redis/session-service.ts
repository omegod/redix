import { readFileSync } from "node:fs";
import Redis, { Cluster } from "ioredis";
import type { Redis as RedisSingle } from "ioredis";
import type {
  CommandResult,
  ConnectionProfile,
  CreateKeyPayload,
  ItemAddPayload,
  ItemSavePayload,
  KeyDetails,
  KeyMetadata,
  KeyScanRequest,
  KeyScanResult,
  LogEntry,
  RedisKeyType,
  RedisServerMode,
  ServerInfoPayload,
  SessionMetrics,
  SessionSummary
} from "../../shared/types";
import { LogStore } from "../store/log-store";
import { createForwards, type TunnelHandle } from "./tunnels";
import {
  formatBytes,
  getStringLength,
  parseEndpoint,
  parseInfo,
  rawCommand,
  stringifyCommandResult,
  tokenizeCommand,
  type Endpoint,
  type RedisClientLike
} from "./utils";

interface SessionContext {
  summary: SessionSummary;
  profile: ConnectionProfile;
  client: RedisClientLike;
  tunnels: TunnelHandle[];
}

interface ClusterCursorState {
  nodeIndex: number;
  cursors: string[];
}

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeKeyType = (type: string, value?: string): RedisKeyType => {
  if (type === "string" && value) {
    try {
      JSON.parse(value);
      return "json";
    } catch {
      return "string";
    }
  }

  if (
    type === "string" ||
    type === "hash" ||
    type === "list" ||
    type === "set" ||
    type === "zset" ||
    type === "stream" ||
    type === "none"
  ) {
    return type;
  }

  return "string";
};

const loadTls = (profile: ConnectionProfile) => {
  if (!profile.ssl) {
    return undefined;
  }

  return {
    ca: profile.tls.caPath ? readFileSync(profile.tls.caPath) : undefined,
    cert: profile.tls.certPath ? readFileSync(profile.tls.certPath) : undefined,
    key: profile.tls.keyPath ? readFileSync(profile.tls.keyPath) : undefined,
    passphrase: profile.tls.passphrase || undefined
  };
};

const getPrimaryNode = (client: RedisClientLike): RedisSingle => {
  if (client instanceof Cluster) {
    const node = client.nodes("master")[0] ?? client.nodes()[0];
    if (!node) {
      throw new Error("No cluster node available");
    }
    return node;
  }

  return client;
};

const now = () => new Date().toISOString();

export class SessionService {
  private readonly sessions = new Map<string, SessionContext>();

  constructor(private readonly logStore: LogStore) {}

  private appendLog(entry: Omit<LogEntry, "id" | "createdAt">): void {
    this.logStore.append({
      id: newId(),
      createdAt: now(),
      ...entry
    });
  }

  private async withLog<T>(
    sessionId: string,
    command: string,
    run: () => Promise<T>
  ): Promise<T> {
    const session = this.getSession(sessionId);
    try {
      const result = await run();
      this.appendLog({
        sessionId,
        endpoint: session.summary.endpoint,
        command,
        status: "success"
      });
      return result;
    } catch (error) {
      this.appendLog({
        sessionId,
        endpoint: session.summary.endpoint,
        command,
        status: "error",
        detail: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async detectServerMode(client: RedisClientLike): Promise<RedisServerMode> {
    try {
      const sections = parseInfo(await getPrimaryNode(client).info("server"));
      const serverMode = sections.server?.redis_mode ?? "unknown";
      if (serverMode === "standalone" || serverMode === "cluster" || serverMode === "sentinel") {
        return serverMode;
      }
      return "unknown";
    } catch {
      return "unknown";
    }
  }

  private async buildClient(profile: ConnectionProfile): Promise<{
    client: RedisClientLike;
    tunnels: TunnelHandle[];
    endpoint: string;
  }> {
    const tls = loadTls(profile);
    const tunnels: TunnelHandle[] = [];
    const baseRedisOptions = {
      username: profile.username || undefined,
      password: profile.password || undefined,
      db: profile.database || 0,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      tls
    };

    if (profile.topology === "cluster") {
      const clusterNodes =
        profile.clusterNodes.length > 0
          ? profile.clusterNodes.map(parseEndpoint)
          : [{ host: profile.host, port: profile.port }];

      let startupNodes: Endpoint[] = clusterNodes;
      let natMap: Record<string, Endpoint> | undefined;

      if (profile.ssh.enabled) {
        const created = await createForwards(profile, clusterNodes);
        tunnels.push(...created);
        startupNodes = created.map((item) => item.local);
        natMap = Object.fromEntries(
          created.map((item) => [`${item.remote.host}:${item.remote.port}`, item.local])
        );
      }

      const client = new Cluster(startupNodes, {
        natMap,
        redisOptions: {
          username: baseRedisOptions.username,
          password: baseRedisOptions.password,
          tls
        }
      });

      await client.connect();

      return {
        client,
        tunnels,
        endpoint: clusterNodes.map((node) => `${node.host}:${node.port}`).join(", ")
      };
    }

    if (profile.topology === "sentinel") {
      const sentinels =
        profile.sentinelNodes.length > 0
          ? profile.sentinelNodes.map(parseEndpoint)
          : [{ host: profile.host, port: profile.port }];

      if (profile.ssh.enabled) {
        throw new Error("Sentinel + SSH is not implemented in this migration yet.");
      }

      const client = new Redis({
        sentinels,
        name: profile.sentinelName || "mymaster",
        sentinelUsername: profile.sentinelUsername || undefined,
        sentinelPassword: profile.sentinelPassword || undefined,
        username: profile.username || undefined,
        password: profile.password || undefined,
        db: profile.database || 0,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        tls
      });

      await client.connect();

      return {
        client,
        tunnels,
        endpoint: sentinels.map((node) => `${node.host}:${node.port}`).join(", ")
      };
    }

    let target = { host: profile.host, port: profile.port };

    if (profile.ssh.enabled) {
      const created = await createForwards(profile, [target]);
      tunnels.push(...created);
      target = created[0].local;
    }

    const client = new Redis({
      host: target.host,
      port: target.port,
      ...baseRedisOptions
    });

    await client.connect();

    return {
      client,
      tunnels,
      endpoint: `${profile.host}:${profile.port}`
    };
  }

  async testConnection(profile: ConnectionProfile): Promise<SessionSummary> {
    const { client, tunnels, endpoint } = await this.buildClient(profile);
    try {
      await getPrimaryNode(client).ping();
      const serverMode = await this.detectServerMode(client);
      return {
        sessionId: "test-session",
        profileId: profile.id,
        title: profile.title,
        endpoint,
        topology: profile.topology,
        serverMode,
        currentDatabase: profile.topology === "cluster" ? 0 : profile.database
      };
    } finally {
      await Promise.allSettled(tunnels.map(async (item) => await item.close()));
      await client.quit().catch(async () => await client.disconnect());
    }
  }

  async openSession(profile: ConnectionProfile): Promise<SessionSummary> {
    const { client, tunnels, endpoint } = await this.buildClient(profile);
    await getPrimaryNode(client).ping();
    const serverMode = await this.detectServerMode(client);
    const sessionId = newId();

    const summary: SessionSummary = {
      sessionId,
      profileId: profile.id,
      title: profile.title,
      endpoint,
      topology: profile.topology,
      serverMode,
      currentDatabase: profile.topology === "cluster" ? 0 : profile.database
    };

    this.sessions.set(sessionId, {
      summary,
      profile,
      client,
      tunnels
    });

    this.appendLog({
      sessionId,
      endpoint,
      command: "CONNECT",
      status: "success"
    });

    return summary;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    this.sessions.delete(sessionId);
    
    try {
      await Promise.allSettled(session.tunnels.map(async (item) => await item.close()));
      await session.client.quit().catch(async () => await session.client.disconnect());
    } finally {
      // 显式断开引用协助 GC
      (session as any).client = null;
      (session as any).tunnels = [];
    }
  }

  getOpenSessions(): SessionSummary[] {
    return [...this.sessions.values()].map((item) => item.summary);
  }

  private getSession(sessionId: string): SessionContext {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    return session;
  }

  private async switchDatabase(session: SessionContext, database: number): Promise<void> {
    if (session.summary.topology === "cluster") {
      session.summary.currentDatabase = 0;
      return;
    }

    if (session.summary.currentDatabase === database) {
      return;
    }

    await (session.client as RedisSingle).select(database);
    session.summary.currentDatabase = database;
  }

  async getMetrics(sessionId: string): Promise<SessionMetrics> {
    return await this.withLog(sessionId, "INFO server/stats/memory/clients", async () => {
      const session = this.getSession(sessionId);
      const primaryNode = getPrimaryNode(session.client);
      const sections = parseInfo(await primaryNode.info());
      const keyspace = sections.keyspace ?? {};

      const keys = Object.values(keyspace).reduce((total, value) => {
        const matched = /keys=(\d+)/.exec(value);
        return total + (matched ? Number(matched[1]) : 0);
      }, 0);

      return {
        keys,
        memory: sections.memory?.used_memory_human ?? "0 B",
        opsPerSec: Number(sections.stats?.instantaneous_ops_per_sec ?? 0),
        redisVersion: sections.server?.redis_version ?? "-",
        redisMode: sections.server?.redis_mode ?? session.summary.serverMode,
        clients: Number(sections.clients?.connected_clients ?? 0)
      };
    });
  }

  async getServerInfo(sessionId: string): Promise<ServerInfoPayload> {
    return await this.withLog(sessionId, "INFO", async () => {
      const session = this.getSession(sessionId);
      const primaryNode = getPrimaryNode(session.client);
      const raw = await primaryNode.info();
      const sections = parseInfo(raw);
      const metrics = await this.getMetrics(sessionId);
      return { metrics, sections };
    });
  }

  async scanKeys(sessionId: string, request: KeyScanRequest): Promise<KeyScanResult> {
    return await this.withLog(
      sessionId,
      `SCAN ${request.pattern || "*"}`,
      async () => {
        const session = this.getSession(sessionId);
        await this.switchDatabase(session, request.database);

        if (session.client instanceof Cluster) {
          const nodes = session.client.nodes("master");
          const count = request.count ?? 300;
          const initialState: ClusterCursorState = request.cursor
            ? (JSON.parse(Buffer.from(request.cursor, "base64").toString("utf8")) as ClusterCursorState)
            : { nodeIndex: 0, cursors: nodes.map(() => "0") };

          const keys: string[] = [];
          let state = initialState;

          while (state.nodeIndex < nodes.length && keys.length < count) {
            const node = nodes[state.nodeIndex];
            const [nextCursor, pageKeys] = await node.scan(
              state.cursors[state.nodeIndex],
              "MATCH",
              request.pattern || "*",
              "COUNT",
              String(count)
            );

            state.cursors[state.nodeIndex] = nextCursor;
            keys.push(...pageKeys);

            if (nextCursor === "0") {
              state = {
                ...state,
                nodeIndex: state.nodeIndex + 1
              };
            }
          }

          const complete = state.nodeIndex >= nodes.length;
          return {
            keys,
            cursor: complete
              ? undefined
              : Buffer.from(JSON.stringify(state), "utf8").toString("base64"),
            complete,
            database: 0
          };
        }

        const [cursor, keys] = await (session.client as RedisSingle).scan(
          request.cursor ?? "0",
          "MATCH",
          request.pattern || "*",
          "COUNT",
          String(request.count ?? 500)
        );

        return {
          keys,
          cursor: cursor === "0" ? undefined : cursor,
          complete: cursor === "0",
          database: request.database
        };
      }
    );
  }

  async getKeyDetails(
    sessionId: string,
    key: string,
    cursor?: string,
    count = 200
  ): Promise<KeyDetails> {
    return await this.withLog(sessionId, `TYPE ${key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client as any;
      const rawType = (await client.type(key)) as string;

      if (rawType === "none") {
        return {
          metadata: {
            key,
            type: "none",
            ttl: -2,
            length: 0,
            sizeInBytes: 0
          },
          items: [],
          hasMore: false,
          total: 0
        };
      }

      let stringValue = "";
      if (rawType === "string") {
        stringValue = ((await client.get(key)) ?? "") as string;
      }

      const ttl = (await client.ttl(key)) as number;
      const sizeInBytes = Number(
        (await rawCommand(session.client, "MEMORY", ["USAGE", key]).catch(() => 0)) ?? 0
      );

      const type = normalizeKeyType(rawType, stringValue);
      const metadata: KeyMetadata = {
        key,
        type,
        ttl,
        length: 0,
        sizeInBytes
      };

      if (rawType === "string") {
        metadata.length = getStringLength(stringValue);
        return {
          metadata,
          stringValue,
          items: [],
          hasMore: false,
          total: 1
        };
      }

      if (rawType === "hash") {
        const [nextCursor, values] = await client.hscan(key, cursor ?? "0", "COUNT", String(count));
        const total = Number(await client.hlen(key));
        const items = [];
        for (let index = 0; index < values.length; index += 2) {
          const field = String(values[index]);
          const value = String(values[index + 1] ?? "");
          items.push({
            id: field,
            rowType: "hash" as const,
            field,
            value,
            fieldLength: field.length,
            fieldSize: formatBytes(getStringLength(field)),
            valueLength: value.length,
            valueSize: formatBytes(getStringLength(value))
          });
        }
        metadata.length = total;
        return {
          metadata,
          items,
          cursor: nextCursor === "0" ? undefined : nextCursor,
          hasMore: nextCursor !== "0",
          total
        };
      }

      if (rawType === "list") {
        const total = Number(await client.llen(key));
        const offset = Number(cursor ?? "0");
        const values = (await client.lrange(key, offset, offset + count - 1)) as string[];
        metadata.length = total;
        return {
          metadata,
          items: values.map((value, index) => ({
            id: String(offset + index),
            rowType: "list" as const,
            index: offset + index,
            value,
            valueLength: value.length,
            valueSize: formatBytes(getStringLength(value))
          })),
          cursor: offset + values.length >= total ? undefined : String(offset + values.length),
          hasMore: offset + values.length < total,
          total
        };
      }

      if (rawType === "set") {
        const [nextCursor, values] = await client.sscan(key, cursor ?? "0", "COUNT", String(count));
        const total = Number(await client.scard(key));
        metadata.length = total;
        return {
          metadata,
          items: (values as string[]).map((value) => ({
            id: value,
            rowType: "set" as const,
            value,
            valueLength: value.length,
            valueSize: formatBytes(getStringLength(value))
          })),
          cursor: nextCursor === "0" ? undefined : nextCursor,
          hasMore: nextCursor !== "0",
          total
        };
      }

      if (rawType === "zset") {
        const [nextCursor, values] = await client.zscan(key, cursor ?? "0", "COUNT", String(count));
        const total = Number(await client.zcard(key));
        const items = [];
        for (let index = 0; index < values.length; index += 2) {
          const value = String(values[index]);
          const score = Number(values[index + 1] ?? 0);
          items.push({
            id: value,
            rowType: "zset" as const,
            score,
            value,
            valueLength: value.length,
            valueSize: formatBytes(getStringLength(value))
          });
        }
        metadata.length = total;
        return {
          metadata,
          items,
          cursor: nextCursor === "0" ? undefined : nextCursor,
          hasMore: nextCursor !== "0",
          total
        };
      }

      const total = Number(await client.xlen(key));
      const start = cursor ? `(${cursor}` : "-";
      const values = (await client.xrange(key, start, "+", "COUNT", count)) as Array<
        [string, string[]]
      >;
      metadata.length = total;
      return {
        metadata,
        items: values.map(([entryId, fields]) => {
          const data: Record<string, string> = {};
          for (let index = 0; index < fields.length; index += 2) {
            data[String(fields[index])] = String(fields[index + 1] ?? "");
          }
          return {
            id: entryId,
            rowType: "stream" as const,
            entryId,
            value: data,
            fieldCount: Object.keys(data).length,
            valueSize: formatBytes(getStringLength(JSON.stringify(data)))
          };
        }),
        cursor: values.length === 0 ? undefined : values[values.length - 1][0],
        hasMore: values.length === count,
        total
      };
    });
  }

  async saveString(sessionId: string, key: string, value: string): Promise<void> {
    await this.withLog(sessionId, `SET ${key}`, async () => {
      const session = this.getSession(sessionId);
      await (session.client as any).set(key, value);
    });
  }

  async renameKey(sessionId: string, key: string, newKey: string): Promise<void> {
    await this.withLog(sessionId, `RENAME ${key} ${newKey}`, async () => {
      const session = this.getSession(sessionId);
      await (session.client as any).rename(key, newKey);
    });
  }

  async updateKeyTtl(sessionId: string, key: string, ttl: number): Promise<void> {
    await this.withLog(sessionId, `EXPIRE ${key} ${ttl}`, async () => {
      const session = this.getSession(sessionId);
      if (ttl < 0) {
        await (session.client as any).persist(key);
      } else {
        await (session.client as any).expire(key, ttl);
      }
    });
  }

  async deleteKey(sessionId: string, key: string): Promise<void> {
    await this.withLog(sessionId, `DEL ${key}`, async () => {
      const session = this.getSession(sessionId);
      await (session.client as any).del(key);
    });
  }

  async createKey(sessionId: string, payload: CreateKeyPayload): Promise<void> {
    await this.withLog(sessionId, `CREATE ${payload.key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client as any;
      switch (payload.keyType) {
        case "hash":
          await client.hset(payload.key, payload.field || "field", payload.value || "");
          break;
        case "list":
          await client.rpush(payload.key, payload.value || "");
          break;
        case "set":
          await client.sadd(payload.key, payload.value || "");
          break;
        case "zset":
          await client.zadd(payload.key, Number(payload.score ?? 0), payload.value || "");
          break;
        case "stream":
          await client.xadd(payload.key, "*", "field", payload.value || "");
          break;
        case "json":
        case "string":
        default:
          await client.set(payload.key, payload.value || "");
          break;
      }
    });
  }

  async addItem(sessionId: string, payload: ItemAddPayload): Promise<void> {
    await this.withLog(sessionId, `ITEM ADD ${payload.key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client as any;
      switch (payload.keyType) {
        case "hash":
          await client.hset(payload.key, payload.field || "field", payload.value || "");
          break;
        case "list":
          await client.rpush(payload.key, payload.value || "");
          break;
        case "set":
          await client.sadd(payload.key, payload.value || "");
          break;
        case "zset":
          await client.zadd(payload.key, Number(payload.score ?? 0), payload.value || "");
          break;
        case "stream": {
          const args = (payload.streamFields ?? []).flatMap((item) => [item.field, item.value]);
          if (args.length === 0) {
            throw new Error("Stream fields are required");
          }
          await client.xadd(payload.key, "*", ...args);
          break;
        }
        default:
          throw new Error(`Add item is not supported for ${payload.keyType}`);
      }
    });
  }

  async saveItem(sessionId: string, payload: ItemSavePayload): Promise<void> {
    await this.withLog(sessionId, `ITEM SAVE ${payload.key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client as any;
      switch (payload.keyType) {
        case "hash":
          if (!payload.field) {
            throw new Error("Field is required");
          }
          if (payload.originalField && payload.originalField !== payload.field) {
            const multi = client.multi();
            multi.hdel(payload.key, payload.originalField);
            multi.hset(payload.key, payload.field, payload.value || "");
            await multi.exec();
          } else {
            await client.hset(payload.key, payload.field, payload.value || "");
          }
          break;
        case "list":
          if (typeof payload.index !== "number") {
            throw new Error("List index is required");
          }
          await client.lset(payload.key, payload.index, payload.value || "");
          break;
        case "set":
          if (!payload.originalValue) {
            throw new Error("Original set value is required");
          }
          if (payload.originalValue !== payload.value) {
            const multi = client.multi();
            multi.srem(payload.key, payload.originalValue);
            multi.sadd(payload.key, payload.value || "");
            await multi.exec();
          }
          break;
        case "zset":
          if (!payload.originalValue) {
            throw new Error("Original zset member is required");
          }
          if (payload.originalValue !== payload.value || payload.originalScore !== payload.score) {
            const multi = client.multi();
            multi.zrem(payload.key, payload.originalValue);
            multi.zadd(payload.key, Number(payload.score ?? 0), payload.value || "");
            await multi.exec();
          }
          break;
        default:
          throw new Error(`Save item is not supported for ${payload.keyType}`);
      }
    });
  }

  async deleteItem(sessionId: string, payload: ItemSavePayload): Promise<void> {
    await this.withLog(sessionId, `ITEM DELETE ${payload.key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client as any;
      switch (payload.keyType) {
        case "hash":
          await client.hdel(payload.key, payload.originalField || payload.field || "");
          break;
        case "list": {
          if (typeof payload.index !== "number") {
            throw new Error("List index is required");
          }
          const marker = `__redix_delete__${Date.now()}`;
          const multi = client.multi();
          multi.lset(payload.key, payload.index, marker);
          multi.lrem(payload.key, 1, marker);
          await multi.exec();
          break;
        }
        case "set":
          await client.srem(payload.key, payload.originalValue || payload.value || "");
          break;
        case "zset":
          await client.zrem(payload.key, payload.originalValue || payload.value || "");
          break;
        case "stream":
          await client.xdel(payload.key, payload.entryId || "");
          break;
        default:
          throw new Error(`Delete item is not supported for ${payload.keyType}`);
      }
    });
  }

  async executeCommand(sessionId: string, input: string): Promise<CommandResult> {
    const session = this.getSession(sessionId);
    const args = tokenizeCommand(input);
    if (args.length === 0) {
      throw new Error("Command is empty");
    }
    const [command, ...rest] = args;
    
    try {
      const result = await this.withLog(sessionId, input, async () => {
        return await rawCommand(session.client, command, rest);
      });
      return {
        command: input,
        output: stringifyCommandResult(result)
      };
    } catch (error) {
      return {
        command: input,
        output: `(error) ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

