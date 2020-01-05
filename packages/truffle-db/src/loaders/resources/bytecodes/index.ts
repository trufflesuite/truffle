import {
  CompiledContract,
  ContractBytecodes,
  Request
} from "truffle-db/loaders/types";

import { AddBytecodes } from "./add.graphql";
export { AddBytecodes };

interface BytecodesAddResponse {
  data: {
    workspace: {
      bytecodesAdd: DataModel.IBytecodesAddPayload;
    };
  };
}

/**
 * @dev pre-condition: every contract should have both bytecodes
 */
export function* generateBytecodesLoad(
  contracts: CompiledContract[]
): Generator<Request, ContractBytecodes[], BytecodesAddResponse> {
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
    mutation: AddBytecodes,
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
