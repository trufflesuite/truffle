import { TruffleDB } from "truffle-db/db";
import {
  WorkflowCompileResult,
  Request,
  Response
} from "truffle-db/loaders/types";

import { generateBytecodesLoad } from "truffle-db/loaders/resources/bytecodes";
import { generateCompilationsLoad } from "truffle-db/loaders/resources/compilations";
import { generateContractsLoad } from "truffle-db/loaders/resources/contracts";
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

  // for each compilation returned by workflow-compile:
  // - add sources
  // - add bytecodes
  // then, add the compilations in a single mutation
  //
  // track each compilation's bytecodes by contract
  // NOTE: this relies on array indices
  const loadableCompilations = [];
  const compilationContractBytecodes = [];
  for (const compilation of compilationsWithContracts) {
    // add sources for each compilation
    const sources = yield* generateSourcesLoad(compilation);

    // add bytecodes
    const contractBytecodes = yield* generateBytecodesLoad(
      compilation.contracts
    );
    compilationContractBytecodes.push(contractBytecodes);

    // record compilation with its sources (bytecodes are related later)
    loadableCompilations.push({ compilation, sources });
  }
  const compilations = yield* generateCompilationsLoad(loadableCompilations);

  // now time to add contracts and track them by compilation
  //
  // again going one compilation at a time (for impl. convenience; HACK)
  // (@cds-amal reminds that "premature optimization is the root of all evil")
  const compilationContracts = {};
  for (const [
    compilationIndex,
    { id: compilationId }
  ] of compilations.entries()) {
    const compiledContracts =
      compilationsWithContracts[compilationIndex].contracts;
    const contractBytecodes = compilationContractBytecodes[compilationIndex];

    compilationContracts[compilationId] = yield* generateContractsLoad(
      compiledContracts,
      contractBytecodes,
      { id: compilationId }
    );
  }

  return { compilations, compilationContracts };
}
