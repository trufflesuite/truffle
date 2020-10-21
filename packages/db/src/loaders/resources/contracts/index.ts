import {
  LoadedBytecodes,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
import { IdObject } from "@truffle/db/meta";
import { CompiledContract } from "@truffle/compile-common";

import { AddContracts } from "./add.graphql";
export { AddContracts };

export interface LoadableContract {
  contract: CompiledContract;
  path: { sourceIndex: number; contractIndex: number };
  bytecodes: LoadedBytecodes;
  compilation: IdObject<DataModel.Compilation>;
}

export function* generateContractsLoad(
  loadableContracts: LoadableContract[]
): Generator<
  WorkspaceRequest,
  DataModel.Contract[],
  WorkspaceResponse<"contractsAdd", DataModel.ContractsAddPayload>
> {
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
    request: AddContracts,
    variables: { contracts }
  };

  return result.data.contractsAdd.contracts;
}
