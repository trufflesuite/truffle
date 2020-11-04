import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:current");

import {
  IdObject,
  generate,
  Process,
  PrepareBatch,
  _
} from "@truffle/db/project/process";

interface Assignment {
  resource: IdObject;
  name: string;
  type: string;
  current: IdObject<DataModel.NameRecord> | undefined;
}

export function* generateNameRecordsLoad(options: {
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: Assignment[];
  };
}): Process<{
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: (Assignment & {
      nameRecord: IdObject<DataModel.NameRecord>;
    })[];
  };
}> {
  const { batch, unbatch } = prepareNameRecordsBatch(options);

  const nameRecords = yield* generate.load("nameRecords", batch);

  return unbatch(nameRecords);
}

const prepareNameRecordsBatch: PrepareBatch<
  {
    project: IdObject<DataModel.Project>;
    assignments: {
      [collectionName: string]: _[];
    };
  },
  Assignment,
  Assignment & {
    nameRecord: IdObject<DataModel.NameRecord>;
  },
  DataModel.NameRecordInput,
  IdObject<DataModel.NameRecord>
> = structured => {
  const batch = [];
  const breadcrumbs: {
    [index: number]: {
      collectionName: string;
      assignmentIndex: number;
    };
  } = {};

  const { project } = structured;

  for (const [collectionName, assignments] of Object.entries(
    structured.assignments
  )) {
    for (const [assignmentIndex, assignment] of assignments.entries()) {
      const { name, type, resource, current } = assignment;

      breadcrumbs[batch.length] = {
        collectionName,
        assignmentIndex
      };

      batch.push({
        name,
        type,
        resource,
        previous: current
      });
    }
  }

  const unbatch = (results: IdObject<DataModel.NameRecord>[]) => {
    const assignments = {};

    for (const [index, result] of results.entries()) {
      const { collectionName, assignmentIndex } = breadcrumbs[index];

      if (!assignments[collectionName]) {
        assignments[collectionName] = [];
      }

      assignments[collectionName][assignmentIndex] = {
        ...structured.assignments[collectionName][assignmentIndex],
        nameRecord: result
      };
    }

    return { project, assignments };
  };

  return { batch, unbatch };
};
