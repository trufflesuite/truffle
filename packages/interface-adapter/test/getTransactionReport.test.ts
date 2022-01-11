import { describe, it } from "mocha";
import assert from "assert";

import { Server } from "http";
import BN from "bn.js";

import Web3 from "web3";
import Ganache from "ganache-core";

import { createInterfaceAdapter } from "../lib";
import {
  InterfaceAdapter,
  Provider,
  TransactionReceipt
} from "../lib/adapter/types";

const port = 12345;

async function prepareGanache(): Promise<{
  server: Server;
  interfaceAdapter: InterfaceAdapter;
}> {
  return new Promise((resolve, reject) => {
    const server = Ganache.server();
    server.listen(port, () => {
      const interfaceAdapter = createInterfaceAdapter({
        provider: new Web3.providers.HttpProvider(`http://127.0.0.1:${port}`)
      });
      resolve({
        server,
        interfaceAdapter
      });
    });
  });
}

describe("getTransactionReport", function () {
  let provider: any;
  let web3: Web3;

  before("Create Provider", async function () {
    provider = Ganache.provider({ seed: "decoder", gasLimit: 7000000 });
    web3 = new Web3(provider);
  });

  it("calculates cost given an effectiveGasPrice", async function () {
    const preparedGanache = await prepareGanache();
    const accounts = await web3.eth.getAccounts();
    const receipt = await web3.eth.sendTransaction({
      from: accounts[0],
      to: accounts[1]
    });
    const report = await preparedGanache.interfaceAdapter.getTransactionCostReport(
      receipt
    );
    console.log("report", report);
    assert.strictEqual(report.gasPrice, receipt.effectiveGasPrice);
    await preparedGanache.server.close();
  });
});
