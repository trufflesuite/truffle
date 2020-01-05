import {
  CompiledContract,
  ContractBytecodes,
  IdObject,
  toIdObject,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";

import { AddContracts } from "./add.graphql";
export { AddContracts };

/**
 * @dev pre-condition: indexes of array arguments must align
 *   (i.e., contractBytecodes[i] are bytecodes for the i-th compiledContract)
 */
export function* generateContractsLoad(
  compiledContracts: CompiledContract[],
  contractBytecodes: ContractBytecodes[],
  compilation: IdObject<DataModel.ICompilation>
): Generator<
  WorkspaceRequest,
  DataModel.IContract[],
  WorkspaceResponse<"contractsAdd", DataModel.IContractsAddPayload>
> {
  const contracts = compiledContracts.map((contract, index) => {
    const { contractName: name, abi: abiObject } = contract;
    const { createBytecode, callBytecode } = contractBytecodes[index];

    return {
      name,
      abi: {
        json: JSON.stringify(abiObject)
      },
      compilation,
      processedSource: { index },
      createBytecode: toIdObject(createBytecode),
      callBytecode: toIdObject(callBytecode)
    };
  });

  const result = yield {
    request: AddContracts,
    variables: { contracts }
  };

  return result.data.workspace.contractsAdd.contracts;
}
