import { logger } from "@truffle/db/logger";
const debug = logger("db:network:test:mockProvider");

import type {
  Web3BaseProvider,
  JsonRpcIdentifier,
  JsonRpcRequest
} from "web3-types";

import { Batch, Model } from "test/arbitraries/networks";

export const mockProvider = (options: {
  model: Model;
  batch: Batch;
}): Web3BaseProvider => {
  const { model, batch } = options;

  const { networkId, getBlockByNumber } = model.networks[batch.descendantIndex];

  return {
    send(payload, callback) {
      const { jsonrpc, id, method, params } = payload as JsonRpcRequest<any>;

      switch (method) {
        case "eth_getBlockByNumber": {
          const [blockNumber] = params;

          const height = parseInt(blockNumber as string);
          debug("intercepting eth_getBlockByNumber %o", height);

          const block = getBlockByNumber(height);
          debug("block %o", block);

          const result = block
            ? {
                number: `0x${height.toString(16)}`,
                hash: block.hash
              }
            : undefined;

          return callback(null, {
            jsonrpc: jsonrpc as JsonRpcIdentifier,
            id,
            result: result as any
          });
        }
        case "net_version": {
          const result = networkId;
          debug("result %o", result);

          return callback(null, {
            jsonrpc: jsonrpc as JsonRpcIdentifier,
            id,
            result
          });
        }
      }
    }
  } as Web3BaseProvider;
};
