import createIpfsClient from "ipfs-http-client";
import * as Preserve from "@truffle/preserve";
import { IpfsClient } from "./ipfs-adapter";

export interface ConnectOptions {
  controls: Preserve.Controls;
  address: string;
}

export async function* connect(
  options: ConnectOptions
): Preserve.Process<IpfsClient> {
  const { address: url, controls } = options;
  const { step } = controls;

  const task = yield* step({
    message: `Connecting to IPFS node at ${url}...`
  });

  const ipfs = createIpfsClient({ url });

  try {
    const version = await ipfs.version();

    yield* task.succeed({
      result: version,
      message: `Connected to IPFS node at ${url}`
    });
  } catch (error) {
    yield* task.fail({ error });
    return;
  }

  return ipfs;
}
