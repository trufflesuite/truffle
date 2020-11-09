import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:nameRecords");

import { IdObject, resources, Process } from "@truffle/db/project/process";
import * as Batch from "./batch";

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
    current: IdObject<DataModel.NameRecord> | undefined;
  };
  properties: {
    nameRecord: IdObject<DataModel.NameRecord>;
  };
  entry: DataModel.NameRecordInput;
  result: IdObject<DataModel.NameRecord>;
}>({
  extract<_I>({ input: { resource, name, type, current } }) {
    return { resource, name, type, previous: current };
  },

  *process({ batch }) {
    debug("batch %o", batch);
    return yield* resources.load("nameRecords", batch);
  },

  convert<_I, _O>({ result, input }) {
    debug("converting %o", result);
    return {
      ...input,
      nameRecord: result
    };
  }
});
