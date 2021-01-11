import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networks");

import { DataModel, IdObject, resources } from "@truffle/db/project/process";
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
      network: IdObject<DataModel.Network>;
    };
  };
  entry: DataModel.NetworkInput;
  result: IdObject<DataModel.Network>;
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
