import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:projects");

import { Load } from "@truffle/db/loaders/types";
import { IdObject } from "@truffle/db/meta";

import { AddProjects } from "./add.graphql";
import { AssignProjectNames } from "./assign.graphql";
import { ResolveProjectName } from "./resolve.graphql";
export { AddProjects, AssignProjectNames, ResolveProjectName };

export function* generateProjectLoad(
  directory: string
): Load<DataModel.Project, { graphql: "projectsAdd" }> {
  const result = yield {
    type: "graphql",
    request: AddProjects,
    variables: {
      projects: [{ directory }]
    }
  };

  return result.data.projectsAdd.projects[0];
}

export function* generateProjectNameResolve(
  project: IdObject<DataModel.Project>,
  name: string,
  type: string
): Load<DataModel.NameRecord, { graphql: "project" }> {
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
): Load<void, { graphql: "projectNamesAssign" }> {
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
