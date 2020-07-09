import * as Preserve from "@truffle/preserve";

export interface GetMinersOptions {
  client: any;
  verbose: boolean;
  controls: Preserve.Controls;
}

export type Miner = any;

export async function* getMiners(
  options: GetMinersOptions
): Preserve.Process<Miner[]> {
  const { client, verbose, controls } = options;

  const { step } = controls;

  const task = verbose
    ? yield* step({ message: "Retrieving miners..." })
    : controls;

  const miners = await client.stateListMiners([]);

  if (verbose) {
    yield* task.succeed();
  }

  return miners;
}
