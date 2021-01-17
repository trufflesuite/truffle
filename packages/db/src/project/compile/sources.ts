import { logger } from "@truffle/db/logger";
const debug = logger("db:project:compile:sources");

import { DataModel, IdObject } from "@truffle/db/resources";
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

export const generateSourcesLoad = Batch.Sources.generate<{
  compilation: {};
  contract: {};
  source: Source;
  resources: { source: IdObject<"sources"> };
  entry: DataModel.SourceInput;
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
