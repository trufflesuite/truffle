import { describe, it } from "mocha";
import assert from "assert";

import { Server } from "http";

import Web3 from "web3";
import Ganache from "ganache-core";

import { Web3Shim } from "../lib";

const port = 12345;

async function prepareGanache(
  quorumEnabled: boolean
): Promise<{ server: Server; web3Shim: Web3Shim }> {
  return new Promise((resolve, reject) => {
    const server = Ganache.server();
    server.listen(port, () => {
      const web3Shim = new Web3Shim({
        provider: new Web3.providers.HttpProvider(`http://127.0.0.1:${port}`),
        networkType: quorumEnabled ? "quorum" : "ethereum"
      });
      resolve({
        server,
        web3Shim
      });
    });
  });
}

const expectedOutput = [{ name: "retVal", type: "uint256" }];
const emptyByte = "";

describe("Quorum decodeParameters Overload", function() {
  it("decodes an empty byte to a '0' string value w/ quorum=true", async function() {
    return new Promise(async (resolve, reject) => {
      let preparedGanache;
      try {
        preparedGanache = await prepareGanache(true);
        const result = await preparedGanache.web3Shim.eth.abi.decodeParameters(
          expectedOutput,
          emptyByte
        );
        assert(result);
        assert(result.retVal === "0");
        preparedGanache.server.close(resolve);
      } catch (e) {
        preparedGanache.server.close(() => {
          reject(e);
        });
      }
    });
  });

  // ganache-core uses web3@1.0.0-beta.35 which doesn't include the 'Out of Gas?' decoder guard!
  it.skip("throws an 'Out of Gas?' error when decoding an empty byte w/ quorum=false", async function() {
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
        preparedGanache.server.close(resolve);
      } catch (e) {
        preparedGanache.server.close(() => {
          reject(e);
        });
      }
    });
  });
});
