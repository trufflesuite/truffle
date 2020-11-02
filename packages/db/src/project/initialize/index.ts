import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:initialize");

import { IdObject, toIdObject } from "@truffle/db/meta";

import { generateProjectLoad } from "@truffle/db/loaders/resources/projects";
import { Process } from "@truffle/db/project/process";

export function* generateInitializeLoad({
  directory
}): Process<IdObject<DataModel.Project>> {
  const project = yield* generateProjectLoad(directory);
  return toIdObject(project);
}
