import {
  generateProjectNameResolve,
  generateProjectNamesAssign
} from "@truffle/db/loaders/resources/projects";

import { generateNameRecordsLoad } from "@truffle/db/loaders/resources/nameRecords";
import { WorkspaceRequest, WorkspaceResponse } from "@truffle/db/loaders/types";
import { IdObject, NamedResource } from "@truffle/db/meta";

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* generateNamesLoad(
  project: IdObject<DataModel.Project>,
  contracts: NamedResource[]
): Generator<WorkspaceRequest, any, WorkspaceResponse<string>> {
  let getCurrent = function*(name, type) {
    return yield* generateProjectNameResolve(project, name, type);
  };

  const nameRecords = yield* generateNameRecordsLoad(
    contracts,
    "Contract",
    getCurrent
  );

  yield* generateProjectNamesAssign(project, nameRecords);
}
