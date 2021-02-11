import {
  LotusClient,
  WsJsonRpcConnector,
  HttpJsonRpcConnector
} from "filecoin.js";
import * as Preserve from "@truffle/preserve";

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

  yield* task.succeed();

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
