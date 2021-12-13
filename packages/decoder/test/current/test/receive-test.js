const debug = require("debug")("decoder:test:receive-test");
const assert = require("chai").assert;
const Ganache = require("ganache");
const path = require("path");
const Web3 = require("web3");

const Decoder = require("../../..");

const { prepareContracts } = require("../../helpers");

describe("Non-function transactions", function () {
  let provider;
  let abstractions;
  let web3;

  let Contracts;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "decoder",
      gasLimit: 7000000,
      logging: { quiet: true }
    });
    web3 = new Web3(provider);
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    const prepared = await prepareContracts(
      provider,
      path.resolve(__dirname, "..")
    );
    abstractions = prepared.abstractions;

    Contracts = [abstractions.ReceiveTest, abstractions.FallbackTest];
  });

  it("should decode transactions that invoke fallback or receive", async function () {
    let receiveTest = await abstractions.ReceiveTest.deployed();
    let fallbackTest = await abstractions.FallbackTest.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: Contracts }
    });

    let receiveHash = (await receiveTest.send(1)).tx;
    let fallbackNoDataHash = (await fallbackTest.send(1)).tx;
    let fallbackDataHash = (
      await receiveTest.sendTransaction({
        to: receiveTest.address,
        data: "0xdeadbeef"
      })
    ).tx;

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
