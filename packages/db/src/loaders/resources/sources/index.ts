import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:sources");

import gql from "graphql-tag";
import { toIdObject } from "@truffle/db/meta";

import { CompilationData, LoadedSources } from "@truffle/db/loaders/types";
import { Process } from "@truffle/db/definitions";
import { generate } from "@truffle/db/generate";

// returns list of IDs
export function* generateSourcesLoad(
  compilation: CompilationData
): Process<LoadedSources> {
  // for each compilation, we need to load sources for each of the contracts
  const inputs = compilation.sources.map(({ input }) => input);

  const ids = (yield* generate.load("sources", inputs)).map(({ id }) => id);
  const sources = yield* generate.find(
    "sources",
    ids,
    gql`
      fragment Source on Source {
        id
        sourcePath
      }
    `
  );

  // return source IDs mapped by sourcePath
  return sources.reduce(
    (obj, source) => ({
      ...obj,
      [source.sourcePath]: toIdObject(source)
    }),
    {}
  );
}
