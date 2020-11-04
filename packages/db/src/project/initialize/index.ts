import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:initialize");

import { IdObject } from "@truffle/db/meta";
import { generate, Process } from "@truffle/db/project/process";

export function* generateInitializeLoad({
  directory
}): Process<IdObject<DataModel.Project>> {
  const [project] = yield* generate.load("projects", [{ directory }]);

  return project;
}
