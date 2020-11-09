import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:current");

import { IdObject, resources, Process } from "@truffle/db/project/process";
import * as Batch from "./batch";

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
    nameRecord: IdObject<DataModel.NameRecord>;
  };
  properties: {
    projectName: IdObject<DataModel.ProjectName>;
  };
  entry: DataModel.ProjectNameInput;
  result: IdObject<DataModel.ProjectName>;
}>({
  extract<_I>({ input: { name, type, nameRecord }, inputs: { project } }) {
    return { project, name, type, nameRecord };
  },

  *process({ batch }) {
    return yield* resources.load("projectNames", batch);
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      projectName: result
    };
  }
});
