import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:contracts");

import gql from "graphql-tag";
import { LoadedBytecodes } from "@truffle/db/loaders/types";
import { Process, resources } from "@truffle/db/project/process";
import { IdObject } from "@truffle/db/meta";
import { CompiledContract } from "@truffle/compile-common";

export { FindContracts } from "./find.graphql";

import { AddContracts } from "./add.graphql";
export { AddContracts };

export function* generateContractGet({
  id
}: IdObject<DataModel.Contract>): Process<DataModel.Contract | undefined> {
  debug("Generating contract get...");

  const contract = yield* resources.get(
    "contracts",
    id,
    gql`
      fragment ContractBytecodes on Contract {
        id
        name
        createBytecode {
          id
          bytes
          linkReferences {
            name
          }
        }
        callBytecode {
          id
          bytes
          linkReferences {
            name
          }
        }
      }
    `
  );

  debug("Generated contract get.");
  return contract;
}
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

  const result = yield {
    type: "graphql",
    request: AddContracts,
    variables: { contracts }
  };

  return result.data.contractsAdd.contracts;
}
