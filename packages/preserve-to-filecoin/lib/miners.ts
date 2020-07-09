import * as Preserve from "@truffle/preserve";

export interface GetMinersOptions {
  client: any;
  controls: Preserve.Controls;
}

export type Miner = any;

export async function* getMiners(
  options: GetMinersOptions
): Preserve.Process<Miner[]> {
  const {
    client,
    controls: { step }
  } = options;

  const task = yield* step({
    message: "Retrieving miners..."
  });

  const miners = await client.stateListMiners([]);

  yield* task.succeed();

  return miners;
}
