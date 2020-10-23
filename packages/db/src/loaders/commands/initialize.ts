import { generateProjectLoad } from "@truffle/db/loaders/resources/projects";
import { WorkspaceRequest, WorkspaceResponse } from "@truffle/db/loaders/types";

export function* generateInitializeLoad({
  directory
}: {
  directory: string;
}): Generator<
  WorkspaceRequest,
  any,
  WorkspaceResponse<"projectsAdd", DataModel.ProjectsAddPayload>
> {
  const project = yield* generateProjectLoad(directory);
  return project;
}
