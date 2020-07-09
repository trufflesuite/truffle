const IpfsHttpClient: any = require("ipfs-http-client");

import * as Preserve from "@truffle/preserve";
import { IpfsClient } from "./adapter";

export interface ConnectOptions {
  controls: Preserve.Controls;
  address: string;
  verbose?: boolean;
}

export async function* connect(
  options: ConnectOptions
): Preserve.Process<IpfsClient> {
  const { address, verbose = false, controls } = options;

  const { step } = controls;

  // for verbose logging, create a separate sub-task
  const task = verbose
    ? yield* step({ message: `Connecting to IPFS node at ${address}...` })
    : controls;

  // init client
  const ipfs = IpfsHttpClient(address);

  try {
    const version = await ipfs.version();
    if (verbose) {
      yield* task.succeed({ label: version });
    }
  } catch (error) {
    yield* task.fail({ error });
    return;
  }

  return ipfs;
}
