import { describe, it } from "mocha";
import { assert } from "chai";

const BN = require("bn.js");
import Web3 from "web3";
import Ganache, { Server } from "ganache";

import { createInterfaceAdapter } from "../lib";
import { InterfaceAdapter } from "../lib/adapter/types";

const genesisBlockTime = new Date();
const port = 12345;

async function prepareGanache(
  quorumEnabled: boolean
): Promise<{ server: Server; interfaceAdapter: InterfaceAdapter }> {
  return new Promise(resolve => {
    const server = Ganache.server({
      time: genesisBlockTime,
      logging: {
        quiet: true
      },
      miner: {
        instamine: "strict"
      }
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

describe("Quorum getBlock Overload", function () {
  it("recovers block timestamp as hexstring instead of number w/ quorum=true", async function () {
    const preparedGanache = await prepareGanache(true);
    try {
      const block = await preparedGanache.interfaceAdapter.getBlock(0);
      const expectedBlockTime = new BN(genesisBlockTime.getTime()).divn(1000);
      assert.strictEqual(
        block.timestamp,
        "0x" + expectedBlockTime.toString(16)
      );
    } finally {
      await preparedGanache.server.close();
    }
  });

  it("recovers block timestamp as number w/ quorum=false", async function () {
    const preparedGanache = await prepareGanache(false);
    try {
      const block = await preparedGanache.interfaceAdapter.getBlock(0);
      const expectedBlockTime = new BN(genesisBlockTime.getTime()).divn(1000);
      assert.strictEqual(block.timestamp, expectedBlockTime.toNumber());
    } finally {
      await preparedGanache.server.close();
    }
  });
});
