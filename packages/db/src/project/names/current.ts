import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:current");

import gql from "graphql-tag";
import {
  resources,
  toIdObject,
  IdObject,
  Process
} from "@truffle/db/project/process";
import * as Batch from "./batch";

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
  assignment: {
    name: string;
    type: string;
  };
  properties: {
    current: IdObject<DataModel.NameRecord> | undefined;
  };
  entry: {
    name: string;
    type: string;
  };
  result: IdObject<DataModel.NameRecord> | undefined;
}>({
  extract<_I>({ input: { name, type } }) {
    return { name, type };
  },

  *process({ batch, inputs: { project } }) {
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

    return nameRecords;
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      ...result
    };
  }
});
