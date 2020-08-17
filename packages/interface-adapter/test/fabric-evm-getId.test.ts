import { describe, it } from "mocha";
import assert from "assert";

import { Server } from "http";

import Web3 from "web3";
import Ganache from "ganache-core";

import { createInterfaceAdapter } from "../lib";
import { InterfaceAdapter } from "../lib/adapter/types";

const port = 12345;

async function prepareGanache(
  fabricEvmEnabled: boolean
): Promise<{ server: Server; interfaceAdapter: InterfaceAdapter }> {
  return new Promise((resolve, reject) => {
    const server = Ganache.server();
    server.listen(port, () => {
      const interfaceAdapter = createInterfaceAdapter({
        provider: new Web3.providers.HttpProvider(`http://127.0.0.1:${port}`),
        networkType: fabricEvmEnabled ? "fabric-evm" : "ethereum"
      });
      resolve({
        server,
        interfaceAdapter
      });
    });
  });
}

describe("fabric-evm getId Overload", function() {
  it("returns networkID as valid string instead of number w/ fabric-evm=true", async function() {
    return new Promise(async (resolve, reject) => {
      let preparedGanache;
      try {
        preparedGanache = await prepareGanache(true);
        const networkID = await preparedGanache.interfaceAdapter.getNetworkId();
        assert(typeof networkID === "string");
        preparedGanache.server.close(resolve);
      } catch (e) {
        preparedGanache.server.close(() => {
          reject(e);
        });
      }
    });
  });

  it("returns networkID as number w/ fabric-evm=false", async function() {
    return new Promise(async (resolve, reject) => {
      let preparedGanache;
      try {
        preparedGanache = await prepareGanache(false);
        const networkID = await preparedGanache.interfaceAdapter.getNetworkId();
        assert(typeof networkID === "number");
        preparedGanache.server.close(resolve);
      } catch (e) {
        preparedGanache.server.close(() => {
          reject(e);
        });
      }
    });
  });
});
