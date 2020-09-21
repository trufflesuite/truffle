import {
  generateProjectNameResolve,
  generateProjectNamesAssign
} from "@truffle/db/loaders/resources/projects";

import { generateNameRecordsLoad } from "@truffle/db/loaders/resources/nameRecords";
import {
  toIdObject,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";
import { projectLoadGenerate } from "./projects";

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* generateNamesLoad(
  project: DataModel.IProject,
  contractsByCompilation: Array<DataModel.IContract[]>
): Generator<WorkspaceRequest, any, WorkspaceResponse<string>> {
  let getCurrent = function* (name, type) {
    return yield* generateProjectNameResolve(toIdObject(project), name, type);
  };

  for (const contracts of contractsByCompilation) {
    const nameRecords = yield* generateNameRecordsLoad(
      contracts,
      "Contract",
      getCurrent
    );

    yield* generateProjectNamesAssign(toIdObject(project), nameRecords);
  }
}
