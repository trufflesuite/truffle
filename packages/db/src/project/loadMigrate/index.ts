/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadMigrate");

import type { ContractObject } from "@truffle/contract-schema/spec";
import { Input, toIdObject, IdObject } from "@truffle/db/resources";
import type { Process } from "@truffle/db/process";

import * as Batch from "./batch";
export { Batch };

import * as FetchNetworkId from "./networkId";
import * as FetchTransactionBlocks from "./blocks";
import * as AddNetworks from "./networks";
import * as LoadNetworkGenealogies from "./networkGenealogies";
import * as GetContracts from "./contracts";
import * as AddContractInstances from "./contractInstances";
export {
  FetchNetworkId,
  FetchTransactionBlocks,
  AddNetworks,
  LoadNetworkGenealogies,
  GetContracts,
  AddContractInstances
};

export type Artifact = ContractObject & {
  networks?: {
    [networkId: string]: {
      db?: {
        network: IdObject<"networks">;
        contractInstance: IdObject<"contractInstances">;
      };
    };
  };
};

export function* process(options: {
  // we'll need everything for this input other than what's calculated here
  network: Omit<Input<"networks">, "networkId" | "historicBlock">;
  artifacts: (ContractObject & {
    db: {
      contract: IdObject<"contracts">;
      callBytecode: IdObject<"bytecodes">;
      createBytecode: IdObject<"bytecodes">;
    };
  })[];
}): Process<{
  network: IdObject<"networks">;
  artifacts: Artifact[];
}> {
  const networkId = yield* FetchNetworkId.process();

  const withBlocks = yield* FetchTransactionBlocks.process({
    network: {
      ...options.network,
      networkId
    },
    artifacts: options.artifacts
  });

  // @ts-ignore
  const withNetworks = yield* AddNetworks.process(withBlocks);

  yield* LoadNetworkGenealogies.process(withNetworks);

  const [
    {
      db: { network }
    }
  ] = withNetworks.artifacts
    .map(({ networks }) => networks[networkId])
    .filter(networkObject => networkObject && networkObject.block)
    .sort((a, b) => b.block.height - a.block.height); // descending

  const withContracts = yield* GetContracts.process(withNetworks);

  const { artifacts } = yield* AddContractInstances.process(
    // @ts-ignore
    withContracts
  );

  return {
    // @ts-ignore
    network: toIdObject(network),
    artifacts: artifacts.map(artifact => ({
      ...artifact,
      networks: artifact.networks
    }))
  };
}
