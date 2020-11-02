import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:projects");

import { Process } from "@truffle/db/definitions";
import { IdObject } from "@truffle/db/meta";

export { AddProjects } from "./add.graphql";
import { AssignProjectNames } from "./assign.graphql";
import { ResolveProjectName } from "./resolve.graphql";
export { AssignProjectNames, ResolveProjectName };

export function* generateProjectNameResolve(
  project: IdObject<DataModel.Project>,
  name: string,
  type: string
): Process<DataModel.NameRecord> {
  const result = yield {
    type: "graphql",
    request: ResolveProjectName,
    variables: {
      projectId: project.id,
      name,
      type
    }
  };

  const nameRecord = result.data.project.resolve[0];

  return nameRecord;
}

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
