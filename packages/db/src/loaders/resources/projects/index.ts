import {
  IdObject,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";

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

  return result.data.workspace.projectsAdd.projects[0];
}
