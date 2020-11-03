import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:resources");

import gql from "graphql-tag";
import pascalCase from "pascal-case";
import { singular } from "pluralize";
import { IdObject } from "@truffle/db/meta";
import { generate } from "@truffle/db/generate";
import { Process, NamedCollectionName } from "@truffle/db/definitions";
import { PrepareBatch, _ } from "@truffle/db/loaders/batch";

interface Assignment {
  resource: IdObject;
}

export function* generateResourceNames(options: {
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: Assignment[];
  };
}): Process<{
  project: IdObject<DataModel.Project>;
  assignments: {
    [collectionName: string]: (Assignment & {
      name: string;
      type: string;
    })[];
  };
}> {
  const { project } = options;

  const result = {
    project,
    assignments: {}
  };
  for (const [collectionName, assignments] of Object.entries(
    options.assignments
  )) {
    const type = pascalCase(singular(collectionName));

    const { batch, unbatch } = prepareResourceNamesBatch({
      project,
      type,
      assignments
    });

    debug("batch %o", batch);

    const resources: { name: string }[] = yield* generate.find(
      collectionName as NamedCollectionName,
      batch.map(({ id }) => id),
      gql`
        fragment ${type}Name on ${type} {
          name
        }
      `
    );

    result.assignments[collectionName] = unbatch(resources).assignments;
  }

  return result;
}

const prepareResourceNamesBatch: PrepareBatch<
  {
    project: IdObject<DataModel.Project>;
    type: string;
    assignments: _[];
  },
  Assignment,
  Assignment & {
    name: string;
    type: string;
  },
  IdObject,
  { name: string }
> = structured => {
  const batch = [];
  const breadcrumbs: {
    [index: number]: {
      assignmentIndex: number;
    };
  } = {};

  const { project, type } = structured;

  for (const [
    assignmentIndex,
    assignment
  ] of structured.assignments.entries()) {
    const { resource } = assignment;

    breadcrumbs[batch.length] = {
      assignmentIndex
    };

    batch.push(resource);
  }

  const unbatch = (results: { name: string }[]) => {
    const assignments: (Assignment & {
      name: string;
      type: string;
    })[] = [];

    for (const [index, { name }] of results.entries()) {
      const { assignmentIndex } = breadcrumbs[index];

      assignments[assignmentIndex] = {
        ...structured.assignments[assignmentIndex],
        name,
        type
      };
    }

    return { project, type, assignments };
  };

  return { batch, unbatch };
};
