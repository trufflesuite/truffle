import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:initialize");

import { IdObject, toIdObject } from "@truffle/db/meta";

import { Process, resources } from "@truffle/db/project/process";

export function* generateInitializeLoad({
  directory
}): Process<IdObject<DataModel.Project>> {
  const [project] = yield* resources.load("projects", [{ directory }]);
  return project;
}
