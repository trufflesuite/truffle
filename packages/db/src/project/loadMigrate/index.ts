/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadMigrate");

import type { ContractObject } from "@truffle/contract-schema/spec";
import type { IdObject } from "@truffle/db/resources";
import type { Process } from "@truffle/db/process";

import * as Batch from "./batch";
export { Batch };

import * as GetContracts from "./contracts";
import * as AddContractInstances from "./contractInstances";
export { GetContracts, AddContractInstances };

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
  network: {
    networkId: string;
  };
  artifacts: (ContractObject & {
    db: {
      contract: IdObject<"contracts">;
      callBytecode: IdObject<"bytecodes">;
      createBytecode: IdObject<"bytecodes">;
    };
    networks?: {
      [networkId: string]: {
        db?: {
          network: IdObject<"networks">;
        };
      };
    };
  })[];
}): Process<{
  artifacts: Artifact[];
}> {
  const withContracts = yield* GetContracts.process(options);

  const { artifacts } = yield* AddContractInstances.process(withContracts);

  return {
    artifacts: artifacts.map(artifact => ({
      ...artifact,
      networks: artifact.networks
    }))
  };
}
