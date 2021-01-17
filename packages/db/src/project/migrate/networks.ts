import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networks");

import { DataModel, IdObject } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";
import * as Batch from "./batch";

export const generateNetworksLoad = Batch.generate<{
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
  entry: DataModel.NetworkInput;
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
