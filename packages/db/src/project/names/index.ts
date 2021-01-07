import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names");

import { Process } from "@truffle/db/process";
import { IdObject, NamedCollectionName } from "@truffle/db/resources";

import { generateResourceNames } from "./resources";
import { generateCurrentNameRecords } from "./current";
import { generateNameRecordsLoad } from "./nameRecords";
import { generateProjectNamesLoad } from "./projectNames";

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* generateNamesLoad(options: {
  project: IdObject<"projects">;
  assignments: {
    [N in NamedCollectionName]?: IdObject<N>[];
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
    .map(([collectionName, resources]) => ({
      [collectionName]: resources.map(resource => ({ resource }))
    }))
    .reduce((a, b) => ({ ...a, ...b }), {});

  const withNameAndType = yield* generateResourceNames({
    project,
    assignments
  });

  const withCurrentNameRecords = yield* generateCurrentNameRecords(
    withNameAndType
  );

  const withNameRecords = yield* generateNameRecordsLoad(
    withCurrentNameRecords
  );

  const withProjectNames = yield* generateProjectNamesLoad(withNameRecords);

  return withProjectNames;
}
