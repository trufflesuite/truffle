import { describe, it } from "mocha";
import { assert } from "chai";

const BN = require("bn.js");
import Ganache, { EthereumProvider } from "ganache";

import { createInterfaceAdapter } from "../lib";
import { InterfaceAdapter, Provider } from "../lib/adapter/types";

const genesisBlockTime = new Date();

function prepareGanache(quorumEnabled: boolean): {
  provider: EthereumProvider;
  interfaceAdapter: InterfaceAdapter;
} {
  const provider = Ganache.provider({
    chain: { time: genesisBlockTime },
    logging: {
      quiet: true
    },
    miner: {
      instamine: "strict"
    }
  });
  const interfaceAdapter = createInterfaceAdapter({
    provider: provider as Provider,
    networkType: quorumEnabled ? "quorum" : "ethereum"
  });
  return {
    provider,
    interfaceAdapter
  };
}

describe("Quorum getBlock Overload", function () {
  it("recovers block timestamp as hexstring instead of number w/ quorum=true", async function () {
    const preparedGanache = prepareGanache(true);
    try {
      const block = await preparedGanache.interfaceAdapter.getBlock(0);
      const expectedBlockTime = new BN(genesisBlockTime.getTime()).divn(1000);
      assert.strictEqual(
        block.timestamp,
        "0x" + expectedBlockTime.toString(16)
      );
    } finally {
      await preparedGanache.provider.disconnect();
    }
  });

  it("recovers block timestamp as number w/ quorum=false", async function () {
    const preparedGanache = prepareGanache(false);
    try {
      const block = await preparedGanache.interfaceAdapter.getBlock(0);
      const expectedBlockTime = new BN(genesisBlockTime.getTime()).divn(1000);
      assert.strictEqual(block.timestamp, expectedBlockTime.toNumber());
    } finally {
      await preparedGanache.provider.disconnect();
    }
  });
});
