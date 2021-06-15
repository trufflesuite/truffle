import {
  LotusClient,
  WsJsonRpcConnector,
  HttpJsonRpcConnector
} from "filecoin.js";
import type * as Preserve from "@truffle/preserve";

export interface ConnectOptions {
  url: string;
  token?: string;
  controls: Preserve.Controls;
}

export async function* connect(
  options: ConnectOptions
): Preserve.Process<LotusClient> {
  const { url, token, controls } = options;
  const { step } = controls;

  const task = yield* step({
    message: `Connecting to Filecoin node at ${url}...`
  });

  const client = createLotusClient({ url, token });

  try {
    // TODO: Ideally I'd retrieve the version instead of ID, but that RPC method
    // is broken in textile's localnet.
    const id = await client.common.id();
    yield* task.succeed({
      result: id,
      message: `Connected to Filecoin node at ${url}`
    });
  } catch (error) {
    yield* task.fail({ error });
  }

  return client;
}

interface CreateLotusClientOptions {
  url: string;
  token?: string;
}

export const createLotusClient = (
  options: CreateLotusClientOptions
): LotusClient => {
  const { url, token } = options;

  const connector = url.startsWith("ws")
    ? new WsJsonRpcConnector({ url, token })
    : new HttpJsonRpcConnector({ url, token });

  const client = new LotusClient(connector);

  return client;
};
