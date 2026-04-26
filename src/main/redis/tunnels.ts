import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import type { Duplex } from "node:stream";
import { Client } from "ssh2";
import type { ConnectionProfile } from "../../shared/types";
import type { Endpoint } from "./utils";

export interface TunnelHandle {
  remote: Endpoint;
  local: Endpoint;
  close: () => Promise<void>;
}

const createSingleForward = async (
  profile: ConnectionProfile,
  remote: Endpoint
): Promise<TunnelHandle> => {
  const ssh = new Client();

  await new Promise<void>((resolve, reject) => {
    ssh
      .once("ready", () => resolve())
      .once("error", (error: Error) => reject(error))
      .connect({
        host: profile.ssh.host,
        port: profile.ssh.port,
        username: profile.ssh.username,
        password: profile.ssh.password || undefined,
        privateKey: profile.ssh.privateKeyPath
          ? readFileSync(profile.ssh.privateKeyPath)
          : undefined
      });
  });

  const server = createServer((socket) => {
    ssh.forwardOut(
      socket.localAddress ?? "127.0.0.1",
      socket.localPort ?? 0,
      remote.host,
      remote.port,
      (error: Error | undefined, stream: Duplex) => {
        if (error) {
          socket.destroy(error);
          return;
        }

        socket.pipe(stream).pipe(socket);
      }
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;

  return {
    remote,
    local: {
      host: "127.0.0.1",
      port: address.port
    },
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      ssh.end();
    }
  };
};

export const createForwards = async (
  profile: ConnectionProfile,
  endpoints: Endpoint[]
): Promise<TunnelHandle[]> => {
  const unique = new Map<string, Endpoint>();

  for (const endpoint of endpoints) {
    unique.set(`${endpoint.host}:${endpoint.port}`, endpoint);
  }

  return await Promise.all(
    [...unique.values()].map(async (endpoint) => await createSingleForward(profile, endpoint))
  );
};
