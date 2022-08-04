import { describe, it } from "mocha";
import { assert } from "chai";

import Ganache from "ganache";

import { Web3Shim } from "../lib";
import { Web3BaseProvider } from "../lib/adapter/types";

function prepareGanache(quorumEnabled: boolean): {
  provider: Web3BaseProvider;
  web3Shim: Web3Shim;
} {
  const provider = Ganache.provider({
    miner: {
      instamine: "strict"
    },
    logging: {
      quiet: true
    }
  }) as unknown as Web3BaseProvider;
  const web3Shim = new Web3Shim({
    provider: provider as Provider,
    networkType: quorumEnabled ? "quorum" : "ethereum"
  });
  return {
    provider,
    web3Shim
  };
}

const expectedOutput = [{ name: "retVal", type: "uint256" }];
const emptyByte = "";

describe("Quorum decodeParameters Overload", function () {
  // web3@4.0.0-alpha does not encode/decode empty or small length bytes values
  it.skip("decodes an empty byte to a '0' string value w/ quorum=true", async function () {
    const preparedGanache = await prepareGanache(true);
    try {
      const result = preparedGanache.web3Shim.eth.abi.decodeParameters(
        expectedOutput,
        emptyByte
      );
      assert(result);
      assert(result.retVal === "0");
    } finally {
      await preparedGanache.provider.disconnect();
    }
  });

  // ganache uses web3@1.0.0-beta.35 which doesn't include the 'Out of Gas?' decoder guard!
  it.skip("throws an 'Out of Gas?' error when decoding an empty byte w/ quorum=false", async function () {
    return new Promise(async (resolve, reject) => {
      let preparedGanache: any;
      try {
        preparedGanache = await prepareGanache(false);
        assert.throws(async () => {
          await preparedGanache.web3Shim.eth.abi.decodeParameters(
            expectedOutput,
            emptyByte
          );
        });
        preparedGanache.provider.disconnect().then(() => resolve());
      } catch (e) {
        preparedGanache.provider.disconnect().then(() => reject(2));
      }
    });
  });
});
