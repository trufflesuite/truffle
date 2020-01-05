import { TruffleDB } from "truffle-db/db";
import {
  WorkflowCompileResult,
  Request,
  Response
} from "truffle-db/loaders/types";

import { generateCompilationsLoad } from "truffle-db/loaders/resources/compilations";
import { generateSourcesLoad } from "truffle-db/loaders/resources/sources";

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
): Generator<Request, any, Response> {
  const compilationsWithContracts = Object.values(result.compilations).filter(
    ({ contracts }) => contracts.length > 0
  );

  let loadableCompilations = [];
  for (let compilation of compilationsWithContracts) {
    // add sources for each compilation
    const sources = yield* generateSourcesLoad(compilation);

    // record compilation with its sources
    loadableCompilations.push({ compilation, sources });
  }

  // then add compilations
  const compilations = yield* generateCompilationsLoad(loadableCompilations);
  return { compilations };
}
