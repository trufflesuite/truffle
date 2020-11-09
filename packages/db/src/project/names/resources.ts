import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:resources");

import gql from "graphql-tag";
import pascalCase from "pascal-case";
import { singular } from "pluralize";
import {
  resources,
  IdObject,
  Process,
  NamedCollectionName
} from "@truffle/db/project/process";
import * as Batch from "./batch";

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
    debug("collectionName %o", collectionName);
    const outputs = yield* generateCollectionAssignments({
      project,
      collectionName,
      assignments
    });
    debug("outputs %o", outputs);

    result.assignments[collectionName] = outputs.assignments;
  }
  debug("result %o", result);

  return result;
}

const generateCollectionAssignments = Batch.generate<{
  assignment: {};
  properties: {
    name: string;
    type: string;
  };
  entry: IdObject;
  result: {
    name: string;
    type: string;
  };
}>({
  extract<_I>({ input: { resource } }) {
    return resource;
  },

  *process({ batch, inputs: { collectionName } }) {
    const type = pascalCase(singular(collectionName));

    const results = yield* resources.find(
      collectionName as NamedCollectionName,
      batch.map(({ id }) => id),
      gql`
        fragment ${type}Name on ${type} {
          name
        }
      `
    );

    return results.map(({ name }) => ({ name, type }));
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      ...result
    };
  }
});
