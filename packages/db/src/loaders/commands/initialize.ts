import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:initialize");

import { IdObject, toIdObject } from "@truffle/db/meta";

import { generateProjectLoad } from "@truffle/db/loaders/resources/projects";
import { Load } from "@truffle/db/loaders/types";

export function* generateInitializeLoad({
  directory
}): Load<IdObject<DataModel.Project>> {
  const project = yield* generateProjectLoad(directory);
  return toIdObject(project);
}
