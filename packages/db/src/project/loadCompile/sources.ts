/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadCompile:sources");

import type { IdObject, Input } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";
import * as Batch from "./batch";

interface Source {
  sourcePath: string;
  contents: string;
  language: string;
  ast: any;
  legacyAST: any;

  db: { source: IdObject<"sources"> };
}

export const process = Batch.Sources.configure<{
  compilation: {};
  contract: {};
  source: Source;
  resources: { source: IdObject<"sources"> };
  entry: Input<"sources">;
  result: IdObject<"sources">;
}>({
  extract<_I>({ input: { sourcePath, contents } }) {
    return { contents, sourcePath };
  },

  *process({ entries }) {
    return yield* resources.load("sources", entries);
  },

  convert<_I, _O>({ result, input: source }) {
    return {
      ...source,
      db: {
        ...source.db,
        source: result
      }
    };
  }
});
