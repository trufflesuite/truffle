import { TruffleDB } from "@truffle/db/db";
import {
  WorkflowCompileResult,
  CompilationData,
  IdObject,
  toIdObject,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";

import { generateBytecodesLoad } from "@truffle/db/loaders/resources/bytecodes";
import { generateCompilationsLoad } from "@truffle/db/loaders/resources/compilations";
import { generateContractsLoad } from "@truffle/db/loaders/resources/contracts";
import { generateSourcesLoad } from "@truffle/db/loaders/resources/sources";
import {
  generateProjectLoad,
  generateProjectNameResolve,
  generateProjectNamesAssign
} from "@truffle/db/loaders/resources/projects";
import { generateNameRecordsLoad } from "@truffle/db/loaders/resources/nameRecords";

/**
 * For a compilation result from @truffle/workflow-compile/new, generate a
 * sequence of GraphQL requests to submit to Truffle DB
 *
 * Returns a generator that yields requests to forward to Truffle DB.
 * When calling `.next()` on this generator, pass any/all responses
 * and ultimately returns nothing when complete.
 */
export function* generateCompileLoad(
  result: WorkflowCompileResult,
  { directory }: { directory: string }
): Generator<WorkspaceRequest, any, WorkspaceResponse<string>> {
  // start by adding loading the project resource
  const project = yield* generateProjectLoad(directory);

  const getCurrent = function*(name, type) {
    return yield* generateProjectNameResolve(toIdObject(project), name, type);
  };

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
    // add sources for each compilation
    const sources: DataModel.ISource[] = yield* generateSourcesLoad(
      compilation
    );

    // add bytecodes
    const bytecodes = yield* generateBytecodesLoad(compilation.contracts);
    compilationBytecodes.push(bytecodes);

    // record compilation with its sources (bytecodes are related later)
    loadableCompilations.push({
      compilation,
      sources: sources.map(toIdObject)
    });
  }
  const compilations = yield* generateCompilationsLoad(loadableCompilations);

  // now time to add contracts and track them by compilation
  //
  // again going one compilation at a time (for impl. convenience; HACK)
  // (@cds-amal reminds that "premature optimization is the root of all evil")
  const compilationContracts = {};
  for (const [compilationIndex, compilation] of compilations.entries()) {
    const compiledContracts =
      resultCompilations[compilationIndex].contracts;
    const bytecodes = compilationBytecodes[compilationIndex];

    const contracts = yield* generateContractsLoad(
      compiledContracts,
      bytecodes,
      ({ id: compilation.id } as unknown) as IdObject<DataModel.ICompilation>
    );

    const nameRecords = yield* generateNameRecordsLoad(
      contracts,
      "Contract",
      getCurrent
    );

    yield* generateProjectNamesAssign(toIdObject(project), nameRecords);

    compilationContracts[compilation.id] = contracts;
  }

  return { project, compilations, compilationContracts };
}

function processResultCompilations(
  result: WorkflowCompileResult
): CompilationData[] {
  return Object.values(result.compilations)
    .filter(({ contracts }) => contracts.length > 0)
    .map(processResultCompilation);
}

function processResultCompilation(resultCompilation): CompilationData {
  // just act as pass-through for now
  return resultCompilation;
}
