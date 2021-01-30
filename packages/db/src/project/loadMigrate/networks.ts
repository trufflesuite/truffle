/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadMigrate:networks");

import type { DataModel, Input, IdObject } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";
import * as Batch from "./batch";

export const process = Batch.configure<{
  network: {
    name: string;
  };
  requires: {
    block?: DataModel.Block;
  };
  produces: {
    db?: {
      network: IdObject<"networks">;
    };
  };
  entry: Input<"networks">;
  result: IdObject<"networks">;
}>({
  extract({
    input: { block },
    inputs: {
      network: { name, networkId }
    }
  }) {
    return { name, networkId, historicBlock: block };
  },

  *process({ entries }) {
    return yield* resources.load("networks", entries);
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      db: {
        network: result
      }
    };
  }
});
