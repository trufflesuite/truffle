import {
  generateProjectNameResolve,
  generateProjectNamesAssign
} from "@truffle/db/loaders/resources/projects";

import { generateNameRecordsLoad } from "@truffle/db/loaders/resources/nameRecords";
import {
  WorkspaceRequest,
  WorkspaceResponse,
  IdObject
} from "@truffle/db/loaders/types";

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* generateNamesLoad(
  project: IdObject<DataModel.IProject>,
  contractsByCompilation: Array<DataModel.IContract[]>
): Generator<WorkspaceRequest, any, WorkspaceResponse<string>> {
  let getCurrent = function* (name, type) {
    return yield* generateProjectNameResolve(project, name, type);
  };

  for (const contracts of contractsByCompilation) {
    const nameRecords = yield* generateNameRecordsLoad(
      contracts,
      "Contract",
      getCurrent
    );

    yield* generateProjectNamesAssign(project, nameRecords);
  }
}
