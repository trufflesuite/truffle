/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:initialize");

import { Resource, Input } from "@truffle/db/resources";
import { resources, Process } from "@truffle/db/process";
import * as FetchNetworkId from "./networkId";
import * as FetchGenesisBlock from "./genesisBlock";

export function* process<
  Network extends Omit<Input<"networks">, "networkId" | "historicBock">
>(options: {
  network: Network;
}): Process<
  Network & Pick<Resource<"networks">, "id" | keyof Input<"networks">>
> {
  const input = {
    ...options.network,
    networkId: yield* FetchNetworkId.process(),
    historicBlock: yield* FetchGenesisBlock.process()
  };

  const [{ id }] = yield* resources.load("networks", [input]);

  return {
    id,
    ...input
  };
}
