import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names");

import { DataModel, IdObject, Process } from "@truffle/db/project/process";

import { generateResourceNames } from "./resources";
import { generateCurrentNameRecords } from "./current";
import { generateNameRecordsLoad } from "./nameRecords";
import { generateProjectNamesLoad } from "./projectNames";

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* generateNamesLoad(options: {
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: IdObject[];
  };
}): Process<{
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: {
      resource: IdObject;
      name: string;
      type: string;
      nameRecord: IdObject<DataModel.NameRecord>;
      projectName: IdObject<DataModel.ProjectName>;
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
