import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:projects");

import { Process } from "@truffle/db/definitions";
import { IdObject } from "@truffle/db/meta";

import { generate } from "@truffle/db/generate";
export { AddProjects } from "./add.graphql";
export { ResolveProjectName } from "./resolve.graphql";
export { AssignProjectNames } from "./assign.graphql";

export function* generateProjectNamesAssign(
  project: IdObject<DataModel.Project>,
  nameRecords: DataModel.NameRecord[]
): Process<void> {
  const projectNames = nameRecords.map(({ id, name, type }) => ({
    project,
    nameRecord: { id },
    name,
    type
  }));

  yield* generate.load("projectNames", projectNames);
}
