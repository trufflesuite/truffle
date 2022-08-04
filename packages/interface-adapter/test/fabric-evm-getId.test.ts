import { describe, it } from "mocha";
import { assert } from "chai";

import Ganache from "ganache";

import { createInterfaceAdapter } from "../lib";
import { InterfaceAdapter, Web3BaseProvider } from "../lib/adapter/types";

function prepareGanache(fabricEvmEnabled: boolean): {
  provider: Web3BaseProvider;
  interfaceAdapter: InterfaceAdapter;
} {
  const provider = Ganache.provider({
    miner: {
      instamine: "strict"
    },
    logging: {
      quiet: false
    }
  }) as unknown as Web3BaseProvider;
  const interfaceAdapter = createInterfaceAdapter({
    provider: provider as Provider,
    networkType: fabricEvmEnabled ? "fabric-evm" : "ethereum"
  });
  return {
    provider,
    interfaceAdapter
  };
}

describe("fabric-evm getId Overload", function () {
  it("returns networkID as valid string instead of number w/ fabric-evm=true", async function () {
    const preparedGanache = await prepareGanache(true);
    try {
      const networkID = await preparedGanache.interfaceAdapter.getNetworkId();
      assert(typeof networkID === "string");
    } finally {
      await preparedGanache.provider.disconnect();
    }
  });

  it("returns networkID as number w/ fabric-evm=false", async function () {
    const preparedGanache = (await prepareGanache(false)) as any;
    try {
      const networkID = await preparedGanache.interfaceAdapter.getNetworkId();
      assert(typeof networkID === "number");
    } finally {
      await preparedGanache.provider.disconnect();
    }
  });
});
