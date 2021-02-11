import * as Preserve from "@truffle/preserve";
import { LotusClient } from "filecoin.js";

export interface GetMinersOptions {
  client: LotusClient;
  controls: Preserve.Controls;
}

export async function* getMiners(
  options: GetMinersOptions
): Preserve.Process<string[]> {
  const { client, controls } = options;
  const { step } = controls;

  const task = yield* step({
    message: "Retrieving miners..."
  });

  const miners = await client.state.listMiners();

  yield* task.succeed();

  return miners;
}
