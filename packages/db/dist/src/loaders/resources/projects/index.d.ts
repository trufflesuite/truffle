import {
  IdObject,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
import { AddProjects } from "./add.graphql";
import { AssignProjectNames } from "./assign.graphql";
import { ResolveProjectName } from "./resolve.graphql";
export { AddProjects, AssignProjectNames, ResolveProjectName };
export declare function generateProjectLoad(
  directory: string
): Generator<
  WorkspaceRequest,
  DataModel.IProject,
  WorkspaceResponse<"projectsAdd", DataModel.IProjectsAddPayload>
>;
export declare function generateProjectNameResolve(
  project: IdObject<DataModel.IProject>,
  name: string,
  type: string
): Generator<
  WorkspaceRequest,
  DataModel.INameRecord,
  WorkspaceResponse<
    "project",
    {
      resolve: DataModel.IProject["resolve"];
    }
  >
>;
export declare function generateProjectNamesAssign(
  project: IdObject<DataModel.IProject>,
  nameRecords: DataModel.INameRecord[]
): Generator<
  WorkspaceRequest,
  void,
  WorkspaceResponse<"projectNamesAssign", DataModel.IProjectNamesAssignPayload>
>;
