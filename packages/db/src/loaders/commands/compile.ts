import { TruffleDB } from "@truffle/db/db";
import {
  WorkflowCompileResult,
  CompilationData,
  toIdObject,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";

import { generateCompilationsLoad } from "@truffle/db/loaders/resources/compilations";
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
): Generator<WorkspaceRequest, any, WorkspaceResponse<string>> {
  const resultCompilations = processResultCompilations(result);

  let loadableCompilations = [];
  for (let compilation of resultCompilations) {
    // add sources for each compilation
    const sources: DataModel.ISource[] = yield* generateSourcesLoad(
      compilation
    );

    // record compilation with its sources
    loadableCompilations.push({
      compilation,
      sources: sources.map(toIdObject)
    });
  }

  // then add compilations
  const compilations = yield* generateCompilationsLoad(loadableCompilations);
  return { compilations };
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
