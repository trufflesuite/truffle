import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networkGenealogies:test:mockProvider");

import type { Provider } from "web3/providers";

import { Batch, Model } from "test/arbitraries/networks";

export const mockProvider = (options: {
  model: Model;
  batch: Batch;
}): Provider => {
  const { model, batch } = options;

  const { getBlockByNumber } = model.networks[batch.descendantIndex];

  return {
    send(payload, callback) {
      const {
        jsonrpc,
        id,
        method,
        params
      } = payload;

      if (method === "eth_getBlockByNumber") {
        const [ blockNumber ] = params;
        debug("intercepting eth_getBlockByNumber %o", blockNumber);

        const result = getBlockByNumber(blockNumber);
        debug("result %o", result);

        return callback(null, {
          jsonrpc,
          id,
          result
        });
      }
    }
  };
}
