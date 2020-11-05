import { logger } from "@truffle/db/logger";
const debug = logger("db:project:compile:contracts");

import { IdObject, resources } from "@truffle/db/project/process";
import * as Batch from "./batch";

export const generateCompilationsContractsLoad = Batch.Contracts.generate<{
  compilation: {
    db: {
      compilation: IdObject<DataModel.Compilation>;
    };
  };
  contract: {
    contractName: string;
    abi: any;
    sourcePath: string;
    db: {
      callBytecode: IdObject<DataModel.Bytecode>;
      createBytecode: IdObject<DataModel.Bytecode>;
    };
  };
  resources: {
    contract: IdObject<DataModel.Contract>;
  };
  entry: DataModel.ContractInput;
  result: IdObject<DataModel.Contract>;
}>({
  extract({ input, inputs, breadcrumb }) {
    debug("inputs %o", inputs);
    debug("breadcrumb %o", breadcrumb);
    const { compilationIndex } = breadcrumb;

    const {
      db: { compilation }
    } = inputs[compilationIndex];

    const {
      contractName: name,
      db: { createBytecode, callBytecode }
    } = input;

    const abi = {
      json: JSON.stringify(input.abi)
    };

    const processedSource = {
      index: inputs[compilationIndex].sourceIndexes.findIndex(
        sourcePath => sourcePath === input.sourcePath
      )
    };

    return {
      name,
      abi,
      compilation,
      processedSource,
      createBytecode,
      callBytecode
    };
  },

  *process({ batch }) {
    return yield* resources.load("contracts", batch);
  },

  convert<_I, _O>({ result, input: contract }) {
    return {
      ...contract,
      db: {
        ...contract.db,
        contract: result
      }
    };
  }
});
