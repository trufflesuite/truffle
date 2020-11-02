import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:contracts");

import { generate } from "@truffle/db/generate";
import { LoadedBytecodes } from "@truffle/db/loaders/types";
import { IdObject } from "@truffle/db/meta";
import { Process } from "@truffle/db/resources";
import { CompiledContract } from "@truffle/compile-common";

export { FindContracts } from "./find.graphql";
export { AddContracts } from "./add.graphql";

export interface LoadableContract {
  contract: CompiledContract;
  path: { sourceIndex: number; contractIndex: number };
  bytecodes: LoadedBytecodes;
  compilation: IdObject<DataModel.Compilation>;
}

export function* generateContractsLoad(
  loadableContracts: LoadableContract[]
): Process<DataModel.Contract[]> {
  const contracts = loadableContracts.map(loadableContract => {
    const {
      contract: { contractName: name, abi: abiObject },
      path: { sourceIndex, contractIndex },
      bytecodes,
      compilation
    } = loadableContract;

    const { createBytecode, callBytecode } = bytecodes.sources[
      sourceIndex
    ].contracts[contractIndex];

    return {
      name,
      abi: {
        json: JSON.stringify(abiObject)
      },
      compilation,
      processedSource: { index: sourceIndex },
      createBytecode: createBytecode,
      callBytecode: callBytecode
    };
  });

  return yield* generate.load("contracts", contracts);
}
