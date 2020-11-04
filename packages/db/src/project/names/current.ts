import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:current");

import gql from "graphql-tag";
import {
  resources,
  toIdObject,
  IdObject,
  Process,
  PrepareBatch,
  _
} from "@truffle/db/project/process";

interface Assignment {
  resource: IdObject;
  name: string;
  type: string;
}

export function* generateCurrentNameRecords(options: {
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: Assignment[];
  };
}): Process<{
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: (Assignment & {
      current: IdObject<DataModel.NameRecord> | undefined;
    })[];
  };
}> {
  const { project } = options;

  const { batch, unbatch } = prepareProjectNamesBatch(options);
  debug("batch %o", batch);

  const nameRecords: (IdObject<DataModel.NameRecord> | undefined)[] = [];
  for (const { name, type } of batch) {
    const {
      resolve: [nameRecord]
    } = yield* resources.get(
      "projects",
      project.id,
      gql`
      fragment Resolve_${type}_${name} on Project {
        resolve(type: "${type}", name: "${name}") {
          id
        }
      }
    `
    );

    nameRecords.push(nameRecord ? toIdObject(nameRecord) : undefined);
  }

  return unbatch(nameRecords);
}

const prepareProjectNamesBatch: PrepareBatch<
  {
    project: IdObject<DataModel.Project>;
    assignments: {
      [collectionName: string]: _[];
    };
  },
  Assignment,
  Assignment & {
    current: IdObject<DataModel.NameRecord> | undefined;
  },
  {
    name: string;
    type: string;
  },
  IdObject<DataModel.NameRecord> | undefined
> = structured => {
  const { project } = structured;
  const batch = [];
  const breadcrumbs: {
    [index: number]: {
      collectionName: string;
      assignmentIndex: number;
    };
  } = {};

  debug("structured.assignments %o", structured.assignments);

  for (const [collectionName, assignments] of Object.entries(
    structured.assignments
  )) {
    for (const [assignmentIndex, assignment] of assignments.entries()) {
      const { name, type } = assignment;

      breadcrumbs[batch.length] = {
        collectionName,
        assignmentIndex
      };

      batch.push({ name, type });
    }
  }

  const unbatch = (results: (IdObject<DataModel.NameRecord> | undefined)[]) => {
    debug("results %o", results);
    const assignments: {
      [collectionName: string]: (Assignment & {
        current: IdObject<DataModel.NameRecord> | undefined;
      })[];
    } = {};

    for (const [index, result] of results.entries()) {
      const { collectionName, assignmentIndex } = breadcrumbs[index];

      if (!assignments[collectionName]) {
        assignments[collectionName] = [];
      }

      assignments[collectionName][assignmentIndex] = {
        ...structured.assignments[collectionName][assignmentIndex],
        current: result
      };
    }

    return { project, assignments };
  };

  return { batch, unbatch };
};
