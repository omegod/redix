import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ConnectionProfile } from "../../shared/types";

const defaultProfile = (): ConnectionProfile => ({
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

export class ConnectionStore {
  private readonly filePath: string;

  constructor(baseDir: string) {
    this.filePath = join(baseDir, "connections.json");
    mkdirSync(dirname(this.filePath), { recursive: true });
  }

  list(): ConnectionProfile[] {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const data = JSON.parse(raw) as ConnectionProfile[];
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

  save(profile: ConnectionProfile): ConnectionProfile {
    const items = this.list();
    const next = items.filter((item) => item.id !== profile.id);
    next.push(profile);
    next.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    writeFileSync(this.filePath, JSON.stringify(next, null, 2));
    return profile;
  }

  delete(profileId: string): void {
    const next = this.list().filter((item) => item.id !== profileId);
    writeFileSync(this.filePath, JSON.stringify(next, null, 2));
  }

  get(profileId: string): ConnectionProfile | undefined {
    return this.list().find((item) => item.id === profileId);
  }
}

