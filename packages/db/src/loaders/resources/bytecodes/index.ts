import {
  CompilationData,
  toIdObject,
  LoadedBytecodes,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
import { CompiledContract } from "@truffle/compile-common";
import { AddBytecodes } from "./add.graphql";
export { AddBytecodes };

/**
 * @dev pre-condition: every contract should have both bytecodes
 */
export function* generateBytecodesLoad(
  compilation: CompilationData
): Generator<
  WorkspaceRequest,
  LoadedBytecodes,
  WorkspaceResponse<"bytecodesAdd", DataModel.IBytecodesAddPayload>
> {
  // we're flattening in order to send all bytecodes in one big list
  // (it's okay, we're gonna recreate the structure before we return)
  const flattenedContracts: CompiledContract[] = compilation.sources
    .map(({ contracts }) => contracts)
    .flat();

  // now pluck all the create/call bytecodes and concat them (creates first)
  const { createBytecodes, callBytecodes } = flattenedContracts
    .filter(({ bytecode }) => bytecode.bytes !== "")
    .reduce(
      (
        { createBytecodes, callBytecodes },
        { deployedBytecode: callBytecode, bytecode: createBytecode }
      ) => ({
        createBytecodes: [...createBytecodes, createBytecode],
        callBytecodes: [...callBytecodes, callBytecode]
      }),
      { createBytecodes: [], callBytecodes: [] }
    );
  const bytecodes = [...createBytecodes, ...callBytecodes];

  // submit
  const result = yield {
    request: AddBytecodes,
    variables: { bytecodes }
  };
  const addedBytecodes = result.data.workspace.bytecodesAdd.bytecodes.map(
    toIdObject
  );

  // okay, now the hard part, putting things back together the way they were!
  // we'll start by zipping the creates/calls back
  const createBytecodesOffset = 0;
  const callBytecodesOffset = createBytecodes.length;
  const contractBytecodes = flattenedContracts.map((_, index) => ({
    createBytecode: addedBytecodes[index + createBytecodesOffset],
    callBytecode: addedBytecodes[index + callBytecodesOffset]
  }));

  // we now have a flat list of pairs of bytecodes, one pair per contract.
  //
  // next: unflatten by following the compilation structure and consuming
  // incrementally from the front of the flat list
  const loadedBytecodes = { sources: [] };
  for (const { contracts } of compilation.sources) {
    const source = { contracts: [] };

    for (const _ of contracts) {
      source.contracts.push(contractBytecodes.shift());
    }

    loadedBytecodes.sources.push(source);
  }

  return loadedBytecodes;
}
