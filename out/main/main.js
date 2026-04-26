import { ipcMain, dialog, app, BrowserWindow, Menu } from "electron";
import { join, dirname } from "node:path";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import Redis, { Command, Cluster } from "ioredis";
import { createServer } from "node:net";
import { Client } from "ssh2";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const normalizeProfile = (profile) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  return {
    ...profile,
    createdAt: profile.createdAt || timestamp,
    updatedAt: timestamp
  };
};
const registerIpc = (connectionStore, sessionService, logStore) => {
  ipcMain.handle("app:pick-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"]
    });
    return result.canceled ? "" : result.filePaths[0] ?? "";
  });
  ipcMain.handle("connections:list", async () => connectionStore.list());
  ipcMain.handle(
    "connections:save",
    async (_event, profile) => connectionStore.save(normalizeProfile(profile))
  );
  ipcMain.handle("connections:delete", async (_event, profileId) => {
    connectionStore.delete(profileId);
  });
  ipcMain.handle(
    "connections:test",
    async (_event, profile) => sessionService.testConnection(normalizeProfile(profile))
  );
  ipcMain.handle("sessions:list", async () => sessionService.getOpenSessions());
  ipcMain.handle("sessions:open", async (_event, profileId) => {
    const profile = connectionStore.get(profileId);
    if (!profile) {
      throw new Error("Connection profile not found");
    }
    return await sessionService.openSession(profile);
  });
  ipcMain.handle("sessions:close", async (_event, sessionId) => {
    await sessionService.closeSession(sessionId);
  });
  ipcMain.handle(
    "sessions:metrics",
    async (_event, sessionId) => await sessionService.getMetrics(sessionId)
  );
  ipcMain.handle(
    "sessions:info",
    async (_event, sessionId) => await sessionService.getServerInfo(sessionId)
  );
  ipcMain.handle(
    "redis:scan-keys",
    async (_event, sessionId, request) => await sessionService.scanKeys(sessionId, request)
  );
  ipcMain.handle(
    "redis:key-details",
    async (_event, sessionId, key, cursor) => await sessionService.getKeyDetails(sessionId, key, cursor)
  );
  ipcMain.handle(
    "redis:save-string",
    async (_event, sessionId, key, value) => await sessionService.saveString(sessionId, key, value)
  );
  ipcMain.handle(
    "redis:rename-key",
    async (_event, sessionId, key, newKey) => await sessionService.renameKey(sessionId, key, newKey)
  );
  ipcMain.handle(
    "redis:update-ttl",
    async (_event, sessionId, key, ttl) => await sessionService.updateKeyTtl(sessionId, key, ttl)
  );
  ipcMain.handle(
    "redis:delete-key",
    async (_event, sessionId, key) => await sessionService.deleteKey(sessionId, key)
  );
  ipcMain.handle(
    "redis:create-key",
    async (_event, sessionId, payload) => await sessionService.createKey(sessionId, payload)
  );
  ipcMain.handle(
    "redis:add-item",
    async (_event, sessionId, payload) => await sessionService.addItem(sessionId, payload)
  );
  ipcMain.handle(
    "redis:save-item",
    async (_event, sessionId, payload) => await sessionService.saveItem(sessionId, payload)
  );
  ipcMain.handle(
    "redis:delete-item",
    async (_event, sessionId, payload) => await sessionService.deleteItem(sessionId, payload)
  );
  ipcMain.handle(
    "redis:execute",
    async (_event, sessionId, input) => await sessionService.executeCommand(sessionId, input)
  );
  ipcMain.handle("logs:list", async () => logStore.list());
  ipcMain.handle("logs:clear", async () => logStore.clear());
};
const createSingleForward = async (profile, remote) => {
  const ssh = new Client();
  await new Promise((resolve, reject) => {
    ssh.once("ready", () => resolve()).once("error", (error) => reject(error)).connect({
      host: profile.ssh.host,
      port: profile.ssh.port,
      username: profile.ssh.username,
      password: profile.ssh.password || void 0,
      privateKey: profile.ssh.privateKeyPath ? readFileSync(profile.ssh.privateKeyPath) : void 0
    });
  });
  const server = createServer((socket) => {
    ssh.forwardOut(
      socket.localAddress ?? "127.0.0.1",
      socket.localPort ?? 0,
      remote.host,
      remote.port,
      (error, stream) => {
        if (error) {
          socket.destroy(error);
          return;
        }
        socket.pipe(stream).pipe(socket);
      }
    );
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  return {
    remote,
    local: {
      host: "127.0.0.1",
      port: address.port
    },
    close: async () => {
      await new Promise((resolve) => server.close(() => resolve()));
      ssh.end();
    }
  };
};
const createForwards = async (profile, endpoints) => {
  const unique = /* @__PURE__ */ new Map();
  for (const endpoint of endpoints) {
    unique.set(`${endpoint.host}:${endpoint.port}`, endpoint);
  }
  return await Promise.all(
    [...unique.values()].map(async (endpoint) => await createSingleForward(profile, endpoint))
  );
};
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const precision = value >= 100 || index === 0 ? 0 : 2;
  return `${value.toFixed(precision)} ${units[index]}`;
};
const getStringLength = (value) => Buffer.byteLength(value, "utf8");
const parseEndpoint = (value) => {
  const [host, port] = value.split(":");
  return {
    host: host.trim(),
    port: Number(port || 6379)
  };
};
const parseInfo = (raw) => {
  const sections = {};
  let currentSection = "default";
  sections[currentSection] = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith("#")) {
      currentSection = trimmed.replace(/^#\s*/, "").toLowerCase();
      sections[currentSection] = sections[currentSection] ?? {};
      continue;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    sections[currentSection][key] = value;
  }
  return sections;
};
const stringifyCommandResult = (result) => {
  if (Buffer.isBuffer(result)) {
    return result.toString("utf8");
  }
  if (typeof result === "string") {
    return result;
  }
  if (result === null || result === void 0) {
    return String(result);
  }
  if (typeof result === "number" || typeof result === "boolean") {
    return String(result);
  }
  return JSON.stringify(
    result,
    (_key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (value && typeof value === "object" && value.type === "Buffer" && Array.isArray(value.data)) {
        return Buffer.from(value.data).toString("utf8");
      }
      return value;
    },
    2
  );
};
const tokenizeCommand = (input) => {
  const tokens = [];
  let current = "";
  let quote = null;
  let escaping = false;
  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
};
const rawCommand = async (client, command, args) => {
  const redisCommand = new Command(command, args);
  return await client.sendCommand(redisCommand);
};
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const normalizeKeyType = (type, value) => {
  if (type === "string" && value) {
    try {
      JSON.parse(value);
      return "json";
    } catch {
      return "string";
    }
  }
  if (type === "string" || type === "hash" || type === "list" || type === "set" || type === "zset" || type === "stream" || type === "none") {
    return type;
  }
  return "string";
};
const loadTls = (profile) => {
  if (!profile.ssl) {
    return void 0;
  }
  return {
    ca: profile.tls.caPath ? readFileSync(profile.tls.caPath) : void 0,
    cert: profile.tls.certPath ? readFileSync(profile.tls.certPath) : void 0,
    key: profile.tls.keyPath ? readFileSync(profile.tls.keyPath) : void 0,
    passphrase: profile.tls.passphrase || void 0
  };
};
const getPrimaryNode = (client) => {
  if (client instanceof Cluster) {
    const node = client.nodes("master")[0] ?? client.nodes()[0];
    if (!node) {
      throw new Error("No cluster node available");
    }
    return node;
  }
  return client;
};
const now = () => (/* @__PURE__ */ new Date()).toISOString();
class SessionService {
  constructor(logStore) {
    this.logStore = logStore;
  }
  logStore;
  sessions = /* @__PURE__ */ new Map();
  appendLog(entry) {
    this.logStore.append({
      id: newId(),
      createdAt: now(),
      ...entry
    });
  }
  async withLog(sessionId, command, run) {
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
  async detectServerMode(client) {
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
  async buildClient(profile) {
    const tls = loadTls(profile);
    const tunnels = [];
    const baseRedisOptions = {
      username: profile.username || void 0,
      password: profile.password || void 0,
      db: profile.database || 0,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      tls
    };
    if (profile.topology === "cluster") {
      const clusterNodes = profile.clusterNodes.length > 0 ? profile.clusterNodes.map(parseEndpoint) : [{ host: profile.host, port: profile.port }];
      let startupNodes = clusterNodes;
      let natMap;
      if (profile.ssh.enabled) {
        const created = await createForwards(profile, clusterNodes);
        tunnels.push(...created);
        startupNodes = created.map((item) => item.local);
        natMap = Object.fromEntries(
          created.map((item) => [`${item.remote.host}:${item.remote.port}`, item.local])
        );
      }
      const client2 = new Cluster(startupNodes, {
        natMap,
        redisOptions: {
          username: baseRedisOptions.username,
          password: baseRedisOptions.password,
          tls
        }
      });
      await client2.connect();
      return {
        client: client2,
        tunnels,
        endpoint: clusterNodes.map((node) => `${node.host}:${node.port}`).join(", ")
      };
    }
    if (profile.topology === "sentinel") {
      const sentinels = profile.sentinelNodes.length > 0 ? profile.sentinelNodes.map(parseEndpoint) : [{ host: profile.host, port: profile.port }];
      if (profile.ssh.enabled) {
        throw new Error("Sentinel + SSH is not implemented in this migration yet.");
      }
      const client2 = new Redis({
        sentinels,
        name: profile.sentinelName || "mymaster",
        sentinelUsername: profile.sentinelUsername || void 0,
        sentinelPassword: profile.sentinelPassword || void 0,
        username: profile.username || void 0,
        password: profile.password || void 0,
        db: profile.database || 0,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        tls
      });
      await client2.connect();
      return {
        client: client2,
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
  async testConnection(profile) {
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
  async openSession(profile) {
    const { client, tunnels, endpoint } = await this.buildClient(profile);
    await getPrimaryNode(client).ping();
    const serverMode = await this.detectServerMode(client);
    const sessionId = newId();
    const summary = {
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
  async closeSession(sessionId) {
    const session = this.getSession(sessionId);
    this.sessions.delete(sessionId);
    await Promise.allSettled(session.tunnels.map(async (item) => await item.close()));
    await session.client.quit().catch(async () => await session.client.disconnect());
  }
  getOpenSessions() {
    return [...this.sessions.values()].map((item) => item.summary);
  }
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    return session;
  }
  async switchDatabase(session, database) {
    if (session.summary.topology === "cluster") {
      session.summary.currentDatabase = 0;
      return;
    }
    if (session.summary.currentDatabase === database) {
      return;
    }
    await session.client.select(database);
    session.summary.currentDatabase = database;
  }
  async getMetrics(sessionId) {
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
  async getServerInfo(sessionId) {
    return await this.withLog(sessionId, "INFO", async () => {
      const session = this.getSession(sessionId);
      const primaryNode = getPrimaryNode(session.client);
      const raw = await primaryNode.info();
      const sections = parseInfo(raw);
      const metrics = await this.getMetrics(sessionId);
      return { metrics, sections };
    });
  }
  async scanKeys(sessionId, request) {
    return await this.withLog(
      sessionId,
      `SCAN ${request.pattern || "*"}`,
      async () => {
        const session = this.getSession(sessionId);
        await this.switchDatabase(session, request.database);
        if (session.client instanceof Cluster) {
          const nodes = session.client.nodes("master");
          const count = request.count ?? 300;
          const initialState = request.cursor ? JSON.parse(Buffer.from(request.cursor, "base64").toString("utf8")) : { nodeIndex: 0, cursors: nodes.map(() => "0") };
          const keys2 = [];
          let state = initialState;
          while (state.nodeIndex < nodes.length && keys2.length < count) {
            const node = nodes[state.nodeIndex];
            const [nextCursor, pageKeys] = await node.scan(
              state.cursors[state.nodeIndex],
              "MATCH",
              request.pattern || "*",
              "COUNT",
              String(count)
            );
            state.cursors[state.nodeIndex] = nextCursor;
            keys2.push(...pageKeys);
            if (nextCursor === "0") {
              state = {
                ...state,
                nodeIndex: state.nodeIndex + 1
              };
            }
          }
          const complete = state.nodeIndex >= nodes.length;
          return {
            keys: keys2,
            cursor: complete ? void 0 : Buffer.from(JSON.stringify(state), "utf8").toString("base64"),
            complete,
            database: 0
          };
        }
        const [cursor, keys] = await session.client.scan(
          request.cursor ?? "0",
          "MATCH",
          request.pattern || "*",
          "COUNT",
          String(request.count ?? 500)
        );
        return {
          keys,
          cursor: cursor === "0" ? void 0 : cursor,
          complete: cursor === "0",
          database: request.database
        };
      }
    );
  }
  async getKeyDetails(sessionId, key, cursor, count = 200) {
    return await this.withLog(sessionId, `TYPE ${key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client;
      const rawType = await client.type(key);
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
        stringValue = await client.get(key) ?? "";
      }
      const ttl = await client.ttl(key);
      const sizeInBytes = Number(
        await rawCommand(session.client, "MEMORY", ["USAGE", key]).catch(() => 0) ?? 0
      );
      const type = normalizeKeyType(rawType, stringValue);
      const metadata = {
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
        const [nextCursor, values2] = await client.hscan(key, cursor ?? "0", "COUNT", String(count));
        const total2 = Number(await client.hlen(key));
        const items = [];
        for (let index = 0; index < values2.length; index += 2) {
          const field = String(values2[index]);
          const value = String(values2[index + 1] ?? "");
          items.push({
            id: field,
            rowType: "hash",
            field,
            value,
            fieldLength: field.length,
            fieldSize: formatBytes(getStringLength(field)),
            valueLength: value.length,
            valueSize: formatBytes(getStringLength(value))
          });
        }
        metadata.length = total2;
        return {
          metadata,
          items,
          cursor: nextCursor === "0" ? void 0 : nextCursor,
          hasMore: nextCursor !== "0",
          total: total2
        };
      }
      if (rawType === "list") {
        const total2 = Number(await client.llen(key));
        const offset = Number(cursor ?? "0");
        const values2 = await client.lrange(key, offset, offset + count - 1);
        metadata.length = total2;
        return {
          metadata,
          items: values2.map((value, index) => ({
            id: String(offset + index),
            rowType: "list",
            index: offset + index,
            value,
            valueLength: value.length,
            valueSize: formatBytes(getStringLength(value))
          })),
          cursor: offset + values2.length >= total2 ? void 0 : String(offset + values2.length),
          hasMore: offset + values2.length < total2,
          total: total2
        };
      }
      if (rawType === "set") {
        const [nextCursor, values2] = await client.sscan(key, cursor ?? "0", "COUNT", String(count));
        const total2 = Number(await client.scard(key));
        metadata.length = total2;
        return {
          metadata,
          items: values2.map((value) => ({
            id: value,
            rowType: "set",
            value,
            valueLength: value.length,
            valueSize: formatBytes(getStringLength(value))
          })),
          cursor: nextCursor === "0" ? void 0 : nextCursor,
          hasMore: nextCursor !== "0",
          total: total2
        };
      }
      if (rawType === "zset") {
        const [nextCursor, values2] = await client.zscan(key, cursor ?? "0", "COUNT", String(count));
        const total2 = Number(await client.zcard(key));
        const items = [];
        for (let index = 0; index < values2.length; index += 2) {
          const value = String(values2[index]);
          const score = Number(values2[index + 1] ?? 0);
          items.push({
            id: value,
            rowType: "zset",
            score,
            value,
            valueLength: value.length,
            valueSize: formatBytes(getStringLength(value))
          });
        }
        metadata.length = total2;
        return {
          metadata,
          items,
          cursor: nextCursor === "0" ? void 0 : nextCursor,
          hasMore: nextCursor !== "0",
          total: total2
        };
      }
      const total = Number(await client.xlen(key));
      const start = cursor ? `(${cursor}` : "-";
      const values = await client.xrange(key, start, "+", "COUNT", count);
      metadata.length = total;
      return {
        metadata,
        items: values.map(([entryId, fields]) => {
          const data = {};
          for (let index = 0; index < fields.length; index += 2) {
            data[String(fields[index])] = String(fields[index + 1] ?? "");
          }
          return {
            id: entryId,
            rowType: "stream",
            entryId,
            value: data,
            fieldCount: Object.keys(data).length,
            valueSize: formatBytes(getStringLength(JSON.stringify(data)))
          };
        }),
        cursor: values.length === 0 ? void 0 : values[values.length - 1][0],
        hasMore: values.length === count,
        total
      };
    });
  }
  async saveString(sessionId, key, value) {
    await this.withLog(sessionId, `SET ${key}`, async () => {
      const session = this.getSession(sessionId);
      await session.client.set(key, value);
    });
  }
  async renameKey(sessionId, key, newKey) {
    await this.withLog(sessionId, `RENAME ${key} ${newKey}`, async () => {
      const session = this.getSession(sessionId);
      await session.client.rename(key, newKey);
    });
  }
  async updateKeyTtl(sessionId, key, ttl) {
    await this.withLog(sessionId, `EXPIRE ${key} ${ttl}`, async () => {
      const session = this.getSession(sessionId);
      if (ttl < 0) {
        await session.client.persist(key);
      } else {
        await session.client.expire(key, ttl);
      }
    });
  }
  async deleteKey(sessionId, key) {
    await this.withLog(sessionId, `DEL ${key}`, async () => {
      const session = this.getSession(sessionId);
      await session.client.del(key);
    });
  }
  async createKey(sessionId, payload) {
    await this.withLog(sessionId, `CREATE ${payload.key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client;
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
  async addItem(sessionId, payload) {
    await this.withLog(sessionId, `ITEM ADD ${payload.key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client;
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
  async saveItem(sessionId, payload) {
    await this.withLog(sessionId, `ITEM SAVE ${payload.key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client;
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
  async deleteItem(sessionId, payload) {
    await this.withLog(sessionId, `ITEM DELETE ${payload.key}`, async () => {
      const session = this.getSession(sessionId);
      const client = session.client;
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
  async executeCommand(sessionId, input) {
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
const defaultProfile = () => ({
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
class ConnectionStore {
  filePath;
  constructor(baseDir) {
    this.filePath = join(baseDir, "connections.json");
    mkdirSync(dirname(this.filePath), { recursive: true });
  }
  list() {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const data = JSON.parse(raw);
      return data.map((item) => ({
        ...defaultProfile(),
        ...item,
        ssh: { ...defaultProfile().ssh, ...item.ssh },
        tls: { ...defaultProfile().tls, ...item.tls }
      }));
    } catch {
      return [];
    }
  }
  save(profile) {
    const items = this.list();
    const next = items.filter((item) => item.id !== profile.id);
    next.push(profile);
    next.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    writeFileSync(this.filePath, JSON.stringify(next, null, 2));
    return profile;
  }
  delete(profileId) {
    const next = this.list().filter((item) => item.id !== profileId);
    writeFileSync(this.filePath, JSON.stringify(next, null, 2));
  }
  get(profileId) {
    return this.list().find((item) => item.id === profileId);
  }
}
class LogStore {
  items = [];
  append(item) {
    this.items.unshift(item);
    if (this.items.length > 500) {
      this.items.length = 500;
    }
  }
  list() {
    return [...this.items];
  }
  clear() {
    this.items.length = 0;
  }
}
app.setName("Redix");
const createWindow = async () => {
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
  if (process.platform === "darwin") {
    const template = [
      {
        label: "Redix",
        // 这里硬编码名称
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
