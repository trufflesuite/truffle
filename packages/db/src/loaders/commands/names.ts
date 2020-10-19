import {
  generateProjectNameResolve,
  generateProjectNamesAssign
} from "@truffle/db/loaders/resources/projects";

import { generateNameRecordsLoad } from "@truffle/db/loaders/resources/nameRecords";
import {
  WorkspaceRequest,
  WorkspaceResponse,
  IdObject,
  NamedResource
} from "@truffle/db/loaders/types";

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* generateNamesLoad(
  project: IdObject<DataModel.IProject>,
  contracts: NamedResource[]
): Generator<WorkspaceRequest, any, WorkspaceResponse<string>> {
  let getCurrent = function* (name, type) {
    return yield* generateProjectNameResolve(project, name, type);
  };

  const nameRecords = yield* generateNameRecordsLoad(
    contracts,
    "Contract",
    getCurrent
  );

  yield* generateProjectNamesAssign(project, nameRecords);
}
