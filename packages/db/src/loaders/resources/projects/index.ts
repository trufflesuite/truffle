import { WorkspaceRequest, WorkspaceResponse } from "@truffle/db/loaders/types";
import { IdObject } from "@truffle/db/meta";

import { AddProjects } from "./add.graphql";
import { AssignProjectNames } from "./assign.graphql";
import { ResolveProjectName } from "./resolve.graphql";
export { AddProjects, AssignProjectNames, ResolveProjectName };

export function* generateProjectLoad(
  directory: string
): Generator<
  WorkspaceRequest,
  DataModel.Project,
  WorkspaceResponse<"projectsAdd", DataModel.ProjectsAddPayload>
> {
  const result = yield {
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
): Generator<
  WorkspaceRequest,
  DataModel.NameRecord,
  WorkspaceResponse<"project", { resolve: DataModel.Project["resolve"] }>
> {
  const result = yield {
    request: ResolveProjectName,
    variables: {
      projectId: project.id,
      name,
      type
    }
  };

  return result.data.project.resolve[0];
}

export function* generateProjectNamesAssign(
  project: IdObject<DataModel.Project>,
  nameRecords: DataModel.NameRecord[]
): Generator<
  WorkspaceRequest,
  void,
  WorkspaceResponse<"projectNamesAssign", DataModel.ProjectNamesAssignPayload>
> {
  const projectNames = nameRecords.map(({ id, name, type }) => ({
    project,
    nameRecord: { id },
    name,
    type
  }));

  yield {
    request: AssignProjectNames,
    variables: { projectNames }
  };
}
