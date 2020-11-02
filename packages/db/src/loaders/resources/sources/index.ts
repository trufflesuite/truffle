import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:sources");

import { IdObject, toIdObject } from "@truffle/db/meta";

import { Load } from "@truffle/db/loaders/types";

import { AddSources } from "./add.graphql";
export { AddSources };

export function* generateSourcesLoad(
  inputs: DataModel.SourceInput[]
): Load<IdObject<DataModel.Source>[], { graphql: "sourcesAdd" }> {
  const result = yield {
    type: "graphql",
    request: AddSources,
    variables: { sources: inputs }
  };

  const { sources } = result.data.sourcesAdd;

  return sources.map(toIdObject);
}
