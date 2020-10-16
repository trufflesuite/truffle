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
  DataModel.IProject,
  WorkspaceResponse<"projectsAdd", DataModel.IProjectsAddPayload>
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
  project: IdObject<DataModel.IProject>,
  name: string,
  type: string
): Generator<
  WorkspaceRequest,
  DataModel.INameRecord,
  WorkspaceResponse<"project", { resolve: DataModel.IProject["resolve"] }>
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
  project: IdObject<DataModel.IProject>,
  nameRecords: DataModel.INameRecord[]
): Generator<
  WorkspaceRequest,
  void,
  WorkspaceResponse<"projectNamesAssign", DataModel.IProjectNamesAssignPayload>
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
