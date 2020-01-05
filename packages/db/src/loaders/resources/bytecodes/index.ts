import {
  CompiledContract,
  ContractBytecodes,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";

import { AddBytecodes } from "./add.graphql";
export { AddBytecodes };

/**
 * @dev pre-condition: every contract should have both bytecodes
 */
export function* generateBytecodesLoad(
  contracts: CompiledContract[]
): Generator<
  WorkspaceRequest,
  ContractBytecodes[],
  WorkspaceResponse<"bytecodesAdd", DataModel.IBytecodesAddPayload>
> {
  const { createBytecodes, callBytecodes } = contracts.reduce(
    (
      { createBytecodes, callBytecodes },
      { deployedBytecode: callBytecode, bytecode: createBytecode }
    ) => ({
      createBytecodes: [...createBytecodes, createBytecode],
      callBytecodes: [...callBytecodes, callBytecode]
    }),
    { createBytecodes: [], callBytecodes: [] }
  );

  // join array (it's okay)
  const bytecodes = [...createBytecodes, ...callBytecodes];

  const result = yield {
    request: AddBytecodes,
    variables: { bytecodes }
  };

  // now slice the array (told you it was okay)
  const createBytecodesOffset = 0;
  const callBytecodesOffset = createBytecodes.length;

  // and use the slice indexes to group back into contracts
  const addedBytecodes = result.data.workspace.bytecodesAdd.bytecodes;
  return contracts.map((_, index) => ({
    createBytecode: addedBytecodes[index + createBytecodesOffset],
    callBytecode: addedBytecodes[index + callBytecodesOffset]
  }));
}
