/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:addNetworks");

import type { DataModel, IdObject, Input } from "@truffle/db/resources";
import { resources, Process } from "@truffle/db/process";

export function* process(options: {
  network: Omit<Input<"networks">, "historicBlock">;
  blocks: DataModel.Block[];
}): Process<(IdObject<"networks"> | undefined)[]> {
  debug("Processing adding networks for blocks...");
  const { network, blocks } = options;

  const networks = yield* resources.load(
    "networks",
    blocks.map(block => ({
      ...network,
      historicBlock: block
    }))
  );

  debug("Processed adding networks for blocks.");
  return networks;
}
