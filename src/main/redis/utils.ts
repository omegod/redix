import { Command } from "ioredis";
import type { Cluster, Redis } from "ioredis";

export type RedisClientLike = Redis | Cluster;

export interface Endpoint {
  host: string;
  port: number;
}

export const formatBytes = (bytes: number): string => {
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

export const getStringLength = (value: string): number => Buffer.byteLength(value, "utf8");

export const parseEndpoint = (value: string): Endpoint => {
  const [host, port] = value.split(":");
  return {
    host: host.trim(),
    port: Number(port || 6379)
  };
};

export const parseInfo = (raw: string): Record<string, Record<string, string>> => {
  const sections: Record<string, Record<string, string>> = {};
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

export const stringifyCommandResult = (result: unknown): string => {
  if (Buffer.isBuffer(result)) {
    return result.toString("utf8");
  }

  if (typeof result === "string") {
    return result;
  }

  if (result === null || result === undefined) {
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

export const tokenizeCommand = (input: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;
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

    if (char === "'" || char === "\"") {
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

export const rawCommand = async (client: RedisClientLike, command: string, args: string[]) => {
  const redisCommand = new Command(command, args);
  return await (client as any).sendCommand(redisCommand);
};

