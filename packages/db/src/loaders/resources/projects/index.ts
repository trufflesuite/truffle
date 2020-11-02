import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:projects");

import { Process } from "@truffle/db/resources";
import { IdObject } from "@truffle/db/meta";

export { AddProjects } from "./add.graphql";
export { ResolveProjectName } from "./resolve.graphql";
import { AssignProjectNames } from "./assign.graphql";
export { AssignProjectNames };

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

  yield {
    type: "graphql",
    request: AssignProjectNames,
    variables: { projectNames }
  };
}
