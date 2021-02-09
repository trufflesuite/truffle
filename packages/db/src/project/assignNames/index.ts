/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:assignNames");

import type { Process } from "@truffle/db/process";
import type {
  IdObject,
  Resource,
  NamedCollectionName
} from "@truffle/db/resources";

import * as Batch from "./batch";
export { Batch };

import * as LookupNames from "./lookupNames";
import * as GetCurrent from "./getCurrent";
import * as AddNameRecords from "./addNameRecords";
import * as UpdateProjectNames from "./updateProjectNames";
export { LookupNames, GetCurrent, AddNameRecords, UpdateProjectNames };

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* process<N extends NamedCollectionName>(options: {
  project: IdObject<"projects">;
  assignments: {
    [K in N]: IdObject<K>[];
  };
}): Process<{
  project: IdObject<"projects">;
  assignments: {
    [collectionName: string]: {
      resource: IdObject;
      name: string;
      type: string;
      nameRecord: IdObject<"nameRecords">;
      projectName: IdObject<"projectNames">;
    }[];
  };
}> {
  const { project } = options;

  const assignments = Object.entries(options.assignments)
    .map(
      ([collectionName, resources]: [
        NamedCollectionName,
        Resource<NamedCollectionName>[]
      ]) => ({
        [collectionName]: resources.map(resource => ({ resource }))
      })
    )
    .reduce((a, b) => ({ ...a, ...b }), {});

  const withNameAndType = yield* LookupNames.process({
    project,
    assignments
  });

  const withCurrentNameRecords = yield* GetCurrent.process(withNameAndType);

  const withNameRecords = yield* AddNameRecords.process(withCurrentNameRecords);

  const withProjectNames = yield* UpdateProjectNames.process(withNameRecords);

  return withProjectNames;
}
