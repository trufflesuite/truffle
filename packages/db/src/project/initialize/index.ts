import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:initialize");

import { IdObject } from "@truffle/db/meta";

import { generate } from "@truffle/db/loaders/generate";
import { Load } from "@truffle/db/loaders/types";

export function* generateInitializeLoad({
  directory
}): Load<IdObject<DataModel.Project>> {
  const [project] = yield* generate.load("projects", [{ directory }]);
  return project;
}
