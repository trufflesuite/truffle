import { describe, it } from "mocha";
import assert from "assert";

import { Server } from "http";
import BN from "bn.js";

import Web3 from "web3";
import Ganache from "ganache-core";

import { createInterfaceAdapter } from "../lib";
import { InterfaceAdapter } from "../lib/adapter/types";

const genesisBlockTime = new Date();
const port = 12345;

async function prepareGanache(
  quorumEnabled: boolean
): Promise<{ server: Server; interfaceAdapter: InterfaceAdapter }> {
  return new Promise((resolve, reject) => {
    const server = Ganache.server({
      time: genesisBlockTime
    });
    server.listen(port, () => {
      const interfaceAdapter = createInterfaceAdapter({
        provider: new Web3.providers.HttpProvider(`http://127.0.0.1:${port}`),
        networkType: quorumEnabled ? "quorum" : "ethereum"
      });
      resolve({
        server,
        interfaceAdapter
      });
    });
  });
}

describe("Quorum getBlock Overload", function() {
  it("recovers block timestamp as hexstring instead of number w/ quorum=true", async function() {
    return new Promise(async (resolve, reject) => {
      let preparedGanache;
      try {
        preparedGanache = await prepareGanache(true);
        const block = await preparedGanache.interfaceAdapter.getBlock(0);
        const expectedBlockTime = new BN(genesisBlockTime.getTime()).divn(1000);
        assert.strictEqual(
          block.timestamp,
          "0x" + expectedBlockTime.toString(16)
        );
        preparedGanache.server.close(resolve);
      } catch (e) {
        preparedGanache.server.close(() => {
          reject(e);
        });
      }
    });
  });

  it("recovers block timestamp as number w/ quorum=false", async function() {
    return new Promise(async (resolve, reject) => {
      let preparedGanache;
      try {
        preparedGanache = await prepareGanache(false);
        const block = await preparedGanache.interfaceAdapter.getBlock(0);
        const expectedBlockTime = new BN(genesisBlockTime.getTime()).divn(1000);
        assert.strictEqual(block.timestamp, expectedBlockTime.toNumber());
        preparedGanache.server.close(resolve);
      } catch (e) {
        preparedGanache.server.close(() => {
          reject(e);
        });
      }
    });
  });
});
