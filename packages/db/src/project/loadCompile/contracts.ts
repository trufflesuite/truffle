/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadCompile:contracts");

import type { DataModel, Input, IdObject } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";
import * as Batch from "./batch";

export const process = Batch.Contracts.configure<{
  compilation: {
    db: {
      compilation: IdObject<"compilations">;
    };
  };
  source: {};
  contract: {
    contractName: string;
    abi: any;
    sourcePath: string;
    db: {
      callBytecode: IdObject<"bytecodes">;
      createBytecode: IdObject<"bytecodes">;
    };
  };
  resources: {
    contract: IdObject<"contracts">;
  };
  entry: Input<"contracts">;
  result: IdObject<"contracts"> | undefined;
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

    const createBytecodeGeneratedSources = toGeneratedSourcesInput({
      generatedSources: input.generatedSources
    });
    const callBytecodeGeneratedSources = toGeneratedSourcesInput({
      generatedSources: input.deployedGeneratedSources
    });

    return {
      name,
      abi,
      compilation,
      processedSource,
      createBytecode,
      callBytecode,
      createBytecodeGeneratedSources,
      callBytecodeGeneratedSources
    };
  },

  *process({ entries }) {
    return yield* resources.load("contracts", entries);
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

function toGeneratedSourcesInput({ generatedSources }) {
  const processedGeneratedSources = (generatedSources || []).reduce(
    (generatedSources: (DataModel.GeneratedSource | undefined)[], input) => {
      generatedSources[input.id] = {
        ast: { json: JSON.stringify(input.ast) },
        contents: input.contents,
        name: input.name,
        language: input.language
      };
      return generatedSources;
    },
    []
  );

  return processedGeneratedSources;
}
