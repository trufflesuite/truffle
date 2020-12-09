import { logger } from "@truffle/db/logger";
const debug = logger("db:project:compile:sources");

import { IdObject, resources } from "@truffle/db/project/process";
import * as Batch from "./batch";

export const generateSourcesLoad = Batch.Sources.generate<{
  compilation: {};
  contract: {};
  source: {};
  resources: { source: IdObject<DataModel.Source> };
  entry: DataModel.SourceInput;
  result: IdObject<DataModel.Source>;
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
