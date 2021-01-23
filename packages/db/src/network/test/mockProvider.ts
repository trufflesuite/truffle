import { logger } from "@truffle/db/logger";
const debug = logger("db:network:test:mockProvider");

import type { Provider } from "web3/providers";

import { Batch, Model } from "test/arbitraries/networks";

export const mockProvider = (options: {
  model: Model;
  batch: Batch;
}): Provider => {
  const { model, batch } = options;

  const {
    networkId,
    getBlockByNumber
  } = model.networks[batch.descendantIndex];

  return {
    send(payload, callback) {
      const {
        jsonrpc,
        id,
        method,
        params
      } = payload;

      switch(method) {
        case "eth_getBlockByNumber": {
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
        case "net_version": {
          const result = networkId
          debug("result %o", result);

          return callback(null, {
            jsonrpc,
            id,
            result
          });
        }
      }
    }
  };
}
