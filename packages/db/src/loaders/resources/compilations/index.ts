import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:compilations");

import { toIdObject, IdObject } from "@truffle/db/meta";
import { Load } from "@truffle/db/loaders/types";

import { AddCompilations } from "./add.graphql";
export { AddCompilations };

import { FindCompilationContracts } from "./find.graphql";
export { GetCompilation } from "./get.graphql";

export function* generateCompilationsLoad(
  inputs: DataModel.CompilationInput[]
): Load<IdObject<DataModel.Compilation>[], { graphql: "compilationsAdd" }> {
  const result = yield {
    type: "graphql",
    request: AddCompilations,
    variables: { compilations: inputs }
  };

  const { compilations } = result.data.compilationsAdd;

  return compilations.map(toIdObject);
}

export function* generateCompilationsContracts(
  compilations: IdObject<DataModel.Compilation>[]
): Load<IdObject<DataModel.Contract>[], { graphql: "compilations" }> {
  const result = yield {
    type: "graphql",
    request: FindCompilationContracts,
    variables: {
      ids: compilations.map(({ id }) => id)
    }
  };

  const contracts = result.data.compilations
    .map(({ contracts }) => contracts)
    .flat();

  return contracts.map(toIdObject);
}
