const debug = require("debug")("decoder:test:compatible-nativize");
const assert = require("chai").assert;
const BN = require("bn.js");
const Ganache = require("ganache");
const path = require("path");
const Web3 = require("web3");

const Decoder = require("../../..");
const Codec = require("@truffle/codec");

const { prepareContracts } = require("../../helpers");

describe("nativize (ethers format)", function () {

  let provider;
  let abstractions;
  let compilations;
  let web3;

  let Contracts;

  before("Create Provider", async function () {
    provider = Ganache.provider({seed: "decoder", gasLimit: 7000000});
    web3 = new Web3(provider);
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(45000);

    const prepared = await prepareContracts(provider, path.resolve(__dirname, ".."));
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;

    Contracts = [abstractions.CompatibleNativizeTest];
  });

  it("should compatibly nativize return values and event arguments", async function () {
    const { CompatibleNativizeTest } = abstractions;
    const instance = await CompatibleNativizeTest.new();

    const decoder = await Decoder.forContract(CompatibleNativizeTest);

    const keyedArray = ["hello", "goodbye"];
    keyedArray.w = "hello";
    keyedArray.z = "goodbye";

    const emitStringSelector = Web3.utils.soliditySha3({
      type: "string",
      value: "emitString()"
    }).slice(2, 10); //I've sliced off the 0x

    let expected = {
      returnString: "hello",
      emitString: {
        '0': "hello",
        z: "hello",
        __length__: 1
      },
      returnTwoStrings: {
        '0': "hello",
        w: "hello",
        '1': "goodbye",
        z: "goodbye"
      },
      emitTwoStrings: {
        '0': "hello",
        w: "hello",
        '1': "goodbye",
        z: "goodbye",
        __length__: 2
      },
      returnStringPair: keyedArray,
      emitStringPair: {
        '0': keyedArray,
        z: keyedArray,
        __length__: 1
      },
      returnFunction: instance.address.toLowerCase() + emitStringSelector,
      returnBytes: null,
      returnCustom: true
    };
    expected.returnStringPair.w = "hello";
    expected.returnStringPair.z = "goodbye";

    for (const entry of CompatibleNativizeTest.abi) {
      if (entry.type === "function") {
        const selector = web3.eth.abi.encodeFunctionSignature(entry);
        if (
          entry.stateMutability === "view" || entry.stateMutability === "pure"
        ) {
          //do a call, decode the return value
          //we need the raw return data, and contract.call() does not exist yet,
          //so we're going to have to use web3.eth.call()
          const data = await web3.eth.call({
            to: instance.address,
            data: selector //no arguments
          });
          const decodings = await decoder.decodeReturnValue(entry, data);
          assert.lengthOf(decodings, 1);
          const decoding = decodings[0];
          const nativized = Codec.Export.nativizeReturn(
            decoding
          );
          assert.deepEqual(nativized, expected[entry.name]);
        } else {
          //send a transaction, decode the events
          const accounts = await web3.eth.getAccounts();
          const receipt = await web3.eth.sendTransaction({
            from: accounts[0],
            to: instance.address,
            data: selector //no arguments
          });
          const logs = receipt.logs;
          assert.lengthOf(logs, 1);
          const log = logs[0];
          const decodings = await decoder.decodeLog(log);
          assert.lengthOf(decodings, 1);
          const decoding = decodings[0];
          const nativized = Codec.Export.nativizeEventArgs(
            decoding
          );
          assert.deepEqual(nativized, expected[entry.name]);
        }
      }
    }
  });
});
