import { describe, it } from "mocha";
import assert from "assert";
import { promisify, inspect } from "util";

import Ganache from "ganache-core";

import Compile from "truffle-compile";
import Contract from "truffle-contract";

import { Web3Shim } from "../lib";
import { JsonRPCRequest, JsonRPCResponse, Callback } from "web3/providers";

const exampleSource = `
pragma solidity ^0.5.0;

contract Example {
  uint public value;

  constructor(uint v) public {
    setValue(v);
  }

  function setValue(uint v) public {
    value = v;
  }
}`;

const compileOptions = {
  contracts_directory: "",
  compilers: {
    solc: {
      version: "0.5.0",
      settings: {
        optimizer: {
          enabled: false
        },
        evmVersion: "byzantium"
      }
    }
  }
};

async function setupProvider(constructor: any, options: any, axcoreEnabled: boolean): Promise<Ganache.Provider> {
  const provider: Ganache.Provider = Ganache.provider({
    blockTime: 0
  });

  const originalSend = provider.send;

  provider.send = (payload: JsonRPCRequest, callback: Callback<JsonRPCResponse>) => {
    let isValid = true;
    if (payload.params.length > 0) {
      if (payload.method === "eth_getTransactionReceipt") {
        isValid = isValid && payload.params.length === 3;
        isValid = isValid && payload.params[1] === options.param1;
        isValid = isValid && payload.params[2] === options.param2;

        // we need to remove the extra params as ganache fails
        // as it doesnt expect them
        payload.params = [ payload.params[0] ];
      }
      else if (typeof payload.params[0] === "object") {
        isValid = isValid && payload.params[0].param1 === options.param1;
        isValid = isValid && payload.params[0].param2 === options.param2;
      }
    }

    if (!isValid) {
      throw new Error(`Did not receive expected AxCore parameters. Payload:\n${inspect(payload)}`);
    }
    else {
      originalSend.call(provider, payload, callback);
    }
  };

  const web3Shim = new Web3Shim({
    provider: provider,
    networkType: axcoreEnabled ? "axcore" : "ethereum"
  });

  constructor.setProvider(provider);

  const accs = await web3Shim.eth.getAccounts();

  constructor.defaults({
    from: accs[0]
  });

  constructor.web3 = web3Shim;

  return provider;
}

describe("AxCore", function() {
  this.timeout(5000);
  let constructor: any;
  let provider: Ganache.Provider;

  before(async function() {
    // @ts-ignore
    const result = await promisify(Compile)({
      "Example.sol": exampleSource
    }, compileOptions);

    if (process.listeners("uncaughtException").length) {
      process.removeListener(
        "uncaughtException",
        process.listeners("uncaughtException")[0]
      );
    }

    constructor = Contract(result.Example);
  });

  it("it fails to deploy due to missing param1", async function() {
    const options = {param2: "hello"};
    provider = await setupProvider(constructor, options, true);
    try {
      await constructor.new(options, 1);
    }
    catch (e) {
      assert(e.message.includes("requires an options parameter"), e.message);
      return;
    }
    assert.fail("Deployed instead of failing to deploy");
  });

  it("it fails to deploy due to missing param2", async function() {
    const options = {param1: "hello"};
    provider = await setupProvider(constructor, options, true);
    try {
      await constructor.new(options, 1);
    }
    catch (e) {
      assert(e.message.includes("requires an options parameter"), e.message);
      return;
    }
    assert.fail("Deployed instead of failing to deploy");
  });

  it("it deploys, sends transaction, and parameters are passed through", async function() {
    const options = {param1: "hello", param2: "world"};
    provider = await setupProvider(constructor, options, true);
    const instance = await constructor.new(options, 1);
    assert.equal((await instance.value()).toString(), "1");
    await instance.setValue(10);
    assert.equal((await instance.value()).toString(), "10");
  });

  afterEach(async function() {
    if (provider) {
      await promisify(provider.close)();
    }
  });
});