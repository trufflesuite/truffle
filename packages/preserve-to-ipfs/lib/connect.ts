import createIpfsClient from "ipfs-http-client";

import * as Preserve from "@truffle/preserve";
import { IpfsClient } from "./adapter";

export interface ConnectOptions {
  controls: Preserve.Controls;
  address: string;
}

export async function* connect(
  options: ConnectOptions
): Preserve.Process<IpfsClient> {
  const {
    address,
    controls: { step }
  } = options;

  const task = yield* step({
    message: `Connecting to IPFS node at ${address}...`
  });

  // init client
  const ipfs = createIpfsClient({ url: address });

  try {
    const version = await ipfs.version();
    yield* task.succeed({
      result: version,
      message: `Connected to IPFS node at ${address}`
    });
  } catch (error) {
    yield* task.fail({ error });
    return;
  }

  return ipfs;
}
