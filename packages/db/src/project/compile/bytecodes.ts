import { logger } from "@truffle/db/logger";
const debug = logger("db:project:compile:bytecodes");

import { DataModel, IdObject } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";
import * as Batch from "./batch";

export const generateBytecodesLoad = Batch.Contracts.generate<{
  compilation: {};
  contract: {
    bytecode: DataModel.BytecodeInput;
    deployedBytecode: DataModel.BytecodeInput;
  };
  source: {};
  resources: {
    callBytecode: IdObject<"bytecodes">;
    createBytecode: IdObject<"bytecodes">;
  };
  entry: {
    callBytecode: DataModel.BytecodeInput;
    createBytecode: DataModel.BytecodeInput;
  };
  result: {
    callBytecode: IdObject<"bytecodes">;
    createBytecode: IdObject<"bytecodes">;
  };
}>({
  extract({
    input: { bytecode: createBytecode, deployedBytecode: callBytecode }
  }) {
    return {
      createBytecode,
      callBytecode
    };
  },

  *process({ entries }) {
    const callBytecodes = yield* resources.load(
      "bytecodes",
      entries.map(({ callBytecode }) => callBytecode)
    );

    const createBytecodes = yield* resources.load(
      "bytecodes",
      entries.map(({ createBytecode }) => createBytecode)
    );

    return callBytecodes.map((callBytecode, index) => ({
      callBytecode,
      createBytecode: createBytecodes[index]
    }));
  },

  convert<_I, _O>({
    result: { callBytecode, createBytecode },
    input: contract
  }) {
    return {
      ...contract,
      db: {
        ...contract.db,
        callBytecode,
        createBytecode
      }
    };
  }
});
