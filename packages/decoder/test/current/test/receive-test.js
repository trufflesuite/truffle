const debug = require("debug")("decoder:test:receive-test");
const assert = require("chai").assert;

const Decoder = require("../../..");

const ReceiveTest = artifacts.require("ReceiveTest");
const FallbackTest = artifacts.require("FallbackTest");

contract("ReceiveTest", function(accounts) {
  it("should decode transactions that invoke fallback or receive", async function() {
    let receiveTest = await ReceiveTest.deployed();
    let fallbackTest = await FallbackTest.deployed();

    const decoder = await Decoder.forProject(web3.currentProvider, [
      FallbackTest,
      ReceiveTest
    ]);

    let receiveHash = (await receiveTest.send(1)).tx;
    let fallbackNoDataHash = (await fallbackTest.send(1)).tx;
    let fallbackDataHash = (await receiveTest.sendTransaction({
      from: accounts[0],
      to: receiveTest.address,
      data: "0xdeadbeef"
    })).tx;

    let receiveTx = await web3.eth.getTransaction(receiveHash);
    let fallbackNoDataTx = await web3.eth.getTransaction(fallbackNoDataHash);
    let fallbackDataTx = await web3.eth.getTransaction(fallbackDataHash);

    let receiveDecoding = await decoder.decodeTransaction(receiveTx);
    let fallbackNoDataDecoding = await decoder.decodeTransaction(
      fallbackNoDataTx
    );
    let fallbackDataDecoding = await decoder.decodeTransaction(fallbackDataTx);

    assert.strictEqual(receiveDecoding.kind, "message");
    assert.strictEqual(receiveDecoding.class.typeName, "ReceiveTest");
    assert.strictEqual(receiveDecoding.data, "0x");
    assert.strictEqual(receiveDecoding.abi.type, "receive");

    assert.strictEqual(fallbackNoDataDecoding.kind, "message");
    assert.strictEqual(fallbackNoDataDecoding.class.typeName, "FallbackTest");
    assert.strictEqual(fallbackNoDataDecoding.data, "0x");
    assert.strictEqual(fallbackNoDataDecoding.abi.type, "fallback");

    assert.strictEqual(fallbackDataDecoding.kind, "message");
    assert.strictEqual(fallbackDataDecoding.class.typeName, "ReceiveTest");
    assert.strictEqual(fallbackDataDecoding.data, "0xdeadbeef");
    assert.strictEqual(fallbackDataDecoding.abi.type, "fallback");
  });
});
