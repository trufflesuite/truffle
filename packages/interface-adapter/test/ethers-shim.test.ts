import { describe, it } from "mocha";
import { assert } from "chai";

import Ganache, { EthereumProvider } from "ganache";

import { createInterfaceAdapter } from "../lib";
import { InterfaceAdapter, Provider } from "../lib/adapter/types";

function prepareProvider(): {
  provider: EthereumProvider;
  interfaceAdapter: InterfaceAdapter;
} {
  const provider = Ganache.provider({
    miner: {
      instamine: "strict"
    },
    logging: {
      quiet: true
    }
  });
  const interfaceAdapter = createInterfaceAdapter({
    provider: provider as Provider,
    networkType: "ethereum"
  });
  return {
    provider,
    interfaceAdapter
  };
}

describe("ethers shim", function () {
  it("returns networkID as valid string", async function () {
    const preparedProvider = await prepareProvider();
    try {
      const networkID = await prepareProvider().interfaceAdapter.getNetworkId();
      assert(typeof networkID === "string");
    } finally {
      await prepareProvider().provider.disconnect();
    }
  });

  it("returns networkID as number w/ fabric-evm=false", async function () {
    const preparedGanache = (await prepareProvider()) as any;
    try {
      const networkID = await preparedGanache.interfaceAdapter.getNetworkId();
      assert(typeof networkID === "number");
    } finally {
      await preparedGanache.provider.disconnect();
    }
  });
});
