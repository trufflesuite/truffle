import { describe, it } from "mocha";
import { assert } from "chai";

import Ganache from "ganache";

import { Web3Shim } from "../lib";
import { Provider } from "../lib/adapter/types";

function prepareGanache(quorumEnabled: boolean): {
  provider: Provider;
  web3Shim: Web3Shim;
} {
  const provider = Ganache.provider({
    miner: {
      instamine: "strict"
    },
    logging: {
      quiet: true
    }
  }) as unknown as Provider;
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

  // ganache uses web3@4.x which throws 'AbiError: Parameter decoding error...' when an empty string is supplied!
  it("throws an 'AbiError: Parameter decoding error ...' error when decoding an empty byte w/ quorum=false", async function () {
    let preparedGanache;
    let error;
    try {
      preparedGanache = await prepareGanache(false);
      preparedGanache.web3Shim.eth.abi.decodeParameters(
        expectedOutput,
        emptyByte
      );
    } catch (e) {
      // this is the expected scenario
      error = e;
    } finally {
      await preparedGanache.provider.disconnect();
      if (!error) {
        throw Error(
          "decodeParameters should have thrown with `quorum=false`! But it did not."
        );
      }
    }
  });
});
