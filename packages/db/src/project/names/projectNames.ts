import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:current");

import {
  resources,
  IdObject,
  Process,
  PrepareBatch,
  _
} from "@truffle/db/project/process";

interface Assignment {
  resource: IdObject;
  name: string;
  type: string;
  nameRecord: IdObject<DataModel.NameRecord>;
}

export function* generateProjectNamesLoad(options: {
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: Assignment[];
  };
}): Process<{
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: (Assignment & {
      projectName: IdObject<DataModel.ProjectName>;
    })[];
  };
}> {
  const { batch, unbatch } = prepareProjectNamesBatch(options);

  const projectNames = yield* resources.load("projectNames", batch);

  return unbatch(projectNames);
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
    projectName: IdObject<DataModel.ProjectName>;
  },
  DataModel.ProjectNameInput,
  IdObject<DataModel.ProjectName>
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
      const { name, type, nameRecord } = assignment;

      breadcrumbs[batch.length] = {
        collectionName,
        assignmentIndex
      };

      batch.push({
        project,
        name,
        type,
        nameRecord
      });
    }
  }

  const unbatch = (results: IdObject<DataModel.ProjectName>[]) => {
    const assignments = {};

    for (const [index, result] of results.entries()) {
      const { collectionName, assignmentIndex } = breadcrumbs[index];

      if (!assignments[collectionName]) {
        assignments[collectionName] = [];
      }

      assignments[collectionName][assignmentIndex] = {
        ...structured.assignments[assignmentIndex],
        projectName: result
      };
    }

    return { project, assignments };
  };

  return { batch, unbatch };
};
