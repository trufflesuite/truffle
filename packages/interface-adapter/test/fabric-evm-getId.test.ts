import { describe, it } from "mocha";
import { assert } from "chai";

import Web3 from "web3";
import Ganache, { Server } from "ganache";

import { createInterfaceAdapter } from "../lib";
import { InterfaceAdapter } from "../lib/adapter/types";

const port = 12345;

async function prepareGanache(
  fabricEvmEnabled: boolean
): Promise<{ server: Server; interfaceAdapter: InterfaceAdapter }> {
  return new Promise(resolve => {
    const server = Ganache.server({
      miner: {
        instamine: "strict"
      },
      logging: {
        quiet: true
      }
    });
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

describe("fabric-evm getId Overload", function () {
  it("returns networkID as valid string instead of number w/ fabric-evm=true", async function () {
    const preparedGanache = await prepareGanache(true);
    try {
      const networkID = await preparedGanache.interfaceAdapter.getNetworkId();
      assert(typeof networkID === "string");
    } finally {
      await preparedGanache.server.close();
    }
  });

  it("returns networkID as number w/ fabric-evm=false", async function () {
    const preparedGanache = (await prepareGanache(false)) as any;
    try {
      const networkID = await preparedGanache.interfaceAdapter.getNetworkId();
      assert(typeof networkID === "number");
    } finally {
      await preparedGanache.server.close();
    }
  });
});
