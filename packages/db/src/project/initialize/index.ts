import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:initialize");

import { IdObject } from "@truffle/db/resources";
import { resources, Process } from "@truffle/db/process";

export function* generateInitializeLoad({
  directory
}): Process<IdObject<"projects">> {
  const [project] = yield* resources.load("projects", [{ directory }]);
  return project;
}
