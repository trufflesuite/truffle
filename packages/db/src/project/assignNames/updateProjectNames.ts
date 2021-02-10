/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:assignNames:updateProjectNames");

import { resources } from "@truffle/db/process";
import type { Input, IdObject } from "@truffle/db/resources";
import * as Batch from "./batch";

export const process = Batch.configure<{
  assignment: {
    name: string;
    type: string;
    nameRecord: IdObject<"nameRecords">;
  };
  properties: {
    projectName: IdObject<"projectNames">;
  };
  entry: Input<"projectNames">;
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
