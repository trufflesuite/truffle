import { generateProjectLoad } from "@truffle/db/loaders/resources/projects";
import { WorkspaceRequest, WorkspaceResponse } from "@truffle/db/loaders/types";

export function* projectLoadGenerate({
  directory
}: {
  directory: string;
}): Generator<
  WorkspaceRequest,
  DataModel.IProject,
  WorkspaceResponse<"projectsAdd", DataModel.IProjectsAddPayload>
> {
  const project = yield* generateProjectLoad(directory);
  return project;
}
