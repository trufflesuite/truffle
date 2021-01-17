import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:current");

import { resources } from "@truffle/db/process";
import { DataModel, IdObject } from "@truffle/db/resources";
import * as Batch from "./batch";

export const generateProjectNamesLoad = Batch.generate<{
  assignment: {
    name: string;
    type: string;
    nameRecord: IdObject<"nameRecords">;
  };
  properties: {
    projectName: IdObject<"projectNames">;
  };
  entry: DataModel.ProjectNameInput;
  result: IdObject<"projectNames">;
}>({
  extract<_I>({ input: { name, type, nameRecord }, inputs: { project } }) {
    return { project, key: { name, type }, nameRecord };
  },

  *process({ entries }) {
    return yield* resources.load("projectNames", entries);
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      projectName: result
    };
  }
});
