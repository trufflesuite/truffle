import {
  CompiledContract,
  ContractBytecodes,
  IdObject,
  LoadedContract,
  Request
} from "truffle-db/loaders/types";

import { AddContracts } from "./add.graphql";
export { AddContracts };

interface ContractsAddResponse {
  data: {
    workspace: {
      contractsAdd: DataModel.IContractsAddPayload;
    };
  };
}

/**
 * @dev pre-condition: indexes of array arguments must align
 *   (i.e., contractBytecodes[i] are bytecodes for the i-th compiledContract)
 */
export function* generateContractsLoad(
  compiledContracts: CompiledContract[],
  contractBytecodes: ContractBytecodes[],
  compilation: IdObject
): Generator<Request, LoadedContract[], ContractsAddResponse> {
  const contracts = compiledContracts.map((contract, index) => {
    const { contractName: name, abi: abiObject } = contract;
    const { createBytecode, callBytecode } = contractBytecodes[index];

    return {
      name,
      abi: {
        json: JSON.stringify(abiObject)
      },
      compilation,
      sourceContract: { index },
      createBytecode: {
        id: createBytecode.id
      },
      callBytecode: {
        id: callBytecode.id
      }
    };
  });

  const result = yield {
    mutation: AddContracts,
    variables: { contracts }
  };

  // return only specific fields
  return result.data.workspace.contractsAdd.contracts.map(
    ({ id, createBytecode, callBytecode }) => ({
      id,
      createBytecode,
      callBytecode
    })
  );
}
