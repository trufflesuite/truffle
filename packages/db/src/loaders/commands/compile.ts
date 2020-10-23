import { CompilationData, Load } from "@truffle/db/loaders/types";
import {
  WorkflowCompileResult,
  Compilation,
  CompiledContract
} from "@truffle/compile-common/src/types";

import { generateBytecodesLoad } from "@truffle/db/loaders/resources/bytecodes";
import { generateCompilationsLoad } from "@truffle/db/loaders/resources/compilations";
import { generateContractsLoad } from "@truffle/db/loaders/resources/contracts";
import { generateSourcesLoad } from "@truffle/db/loaders/resources/sources";

/**
 * For a compilation result from @truffle/workflow-compile/new, generate a
 * sequence of GraphQL requests to submit to Truffle DB
 *
 * Returns a generator that yields requests to forward to Truffle DB.
 * When calling `.next()` on this generator, pass any/all responses
 * and ultimately returns nothing when complete.
 */
export function* generateCompileLoad(
  result: WorkflowCompileResult
): Load<{
  compilations: DataModel.Compilation[];
  contracts: DataModel.Contract[];
}> {
  const resultCompilations = processResultCompilations(result);

  // for each compilation returned by workflow-compile:
  // - add sources
  // - add bytecodes
  // then, add the compilations in a single mutation
  //
  // track each compilation's bytecodes by contract
  // NOTE: this relies on array indices
  const loadableCompilations = [];
  const compilationBytecodes = [];
  for (const compilation of resultCompilations) {
    // add sources
    const sources = yield* generateSourcesLoad(compilation);

    // add bytecodes
    const bytecodes = yield* generateBytecodesLoad(compilation);
    compilationBytecodes.push(bytecodes);

    // record compilation with its sources (bytecodes are related later)
    loadableCompilations.push({
      compilation,
      sources
    });
  }

  const compilations = yield* generateCompilationsLoad(loadableCompilations);

  // now time to add contracts
  //
  // again going one compilation at a time (for impl. convenience; HACK)
  // (@cds-amal reminds that "premature optimization is the root of all evil")
  let contractsByCompilation = [];
  for (const [compilationIndex, compilation] of compilations.entries()) {
    const resultCompilation = resultCompilations[compilationIndex];
    const bytecodes = compilationBytecodes[compilationIndex];

    const loadableContracts = [];
    for (const [
      sourceIndex,
      { contracts }
    ] of resultCompilation.sources.entries()) {
      for (const [contractIndex, contract] of contracts.entries()) {
        loadableContracts.push({
          contract,
          path: { sourceIndex, contractIndex },
          bytecodes,
          compilation
        });
      }
    }

    const loadedContracts = yield* generateContractsLoad(loadableContracts);
    contractsByCompilation.push(loadedContracts);
  }

  const contracts = contractsByCompilation.flat();

  return { compilations, contracts };
}

function processResultCompilations(
  result: WorkflowCompileResult
): CompilationData[] {
  return Object.values(result.compilations)
    .filter(({ contracts }) => contracts.length > 0)
    .map(processResultCompilation);
}

function processResultCompilation(compilation: Compilation): CompilationData {
  const { sourceIndexes, contracts } = compilation;

  const contractsBySourcePath: {
    [sourcePath: string]: CompiledContract[];
  } = contracts
    .map(contract => [contract.sourcePath, contract])
    .reduce(
      (obj, [sourcePath, contract]: [string, CompiledContract]) => ({
        ...obj,
        [sourcePath]: [...(obj[sourcePath] || []), contract]
      }),
      {}
    );

  return {
    // PRECONDITION: all contracts in the same compilation **must** have the
    // same compiler
    compiler: contracts[0].compiler,
    sources: sourceIndexes.map((sourcePath, index) => ({
      index,
      contracts: contractsBySourcePath[sourcePath],
      input: {
        // PRECONDITION: all contracts in the same compilation with the same
        // sourcePath **must** have the same source contents
        contents: contractsBySourcePath[sourcePath][0].source,

        sourcePath
      }
    }))
  };
}
