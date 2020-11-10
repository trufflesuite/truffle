import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:sources");

import { toIdObject } from "@truffle/db/meta";

import { CompilationData, LoadedSources } from "@truffle/db/loaders/types";

import { Process } from "@truffle/db/project/process";

import { AddSources } from "./add.graphql";
export { AddSources };

// returns list of IDs
export function* generateSourcesLoad(
  compilation: CompilationData
): Process<LoadedSources> {
  // for each compilation, we need to load sources for each of the contracts
  const inputs = compilation.sources.map(({ input }) => input);

  const result = yield {
    type: "graphql",
    request: AddSources,
    variables: { sources: inputs }
  };

  const { sources } = result.data.sourcesAdd;

  // return source IDs mapped by sourcePath
  return sources.reduce(
    (obj, source) => ({
      ...obj,
      [source.sourcePath]: toIdObject(source)
    }),
    {}
  );
}
