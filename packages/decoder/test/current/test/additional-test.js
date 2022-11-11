const debug = require("debug")("decoder:test:additional-test");
const assert = require("chai").assert;
const Ganache = require("ganache");
const path = require("path");
const Web3 = require("web3");

const Decoder = require("../../..");

const { prepareContracts } = require("../../helpers");

describe("Adding compilations", function () {
  let provider;
  let abstractions;
  let compilations;
  let web3;

  let Contracts;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      miner: { instamine: "strict" },
      seed: "decoder",
      gasLimit: 7000000,
      logging: { quiet: true }
    });
    web3 = new Web3(provider);
  });

  after(async () => {
    provider && (await provider.disconnect());
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    const prepared = await prepareContracts(
      provider,
      path.resolve(__dirname, "..")
    );
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;

    Contracts = [
      abstractions.WireTest,
      abstractions.WireTestParent,
      abstractions.WireTestLibrary,
      abstractions.WireTestAbstract
    ];
  });

  it("should allow adding compilations", async function () {
    const deployedContract = await abstractions.WireTestRedHerring.deployed();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: Contracts }
    });

    //emit an event we can't decode
    const { receipt } = await deployedContract.run();
    //attempt to decode it; this should fail
    const failingEvents = await decoder.events({
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber
    });
    assert.lengthOf(failingEvents, 1);
    assert.lengthOf(failingEvents[0].decodings, 0);
    //now add more info
    await decoder.addAdditionalProjectInfo({
      artifacts: [abstractions.WireTestRedHerring]
    });
    //attempt to decode it again, it should succeed
    const suceedingEvents = await decoder.events({
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber
    });
    assert.lengthOf(suceedingEvents, 1);
    assert.lengthOf(suceedingEvents[0].decodings, 1);
  });

  it("should error on supplying two compilations with the same ID on startup", async function () {
    try {
      await Decoder.forProject({
        provider: web3.currentProvider,
        projectInfo: { compilations: [compilations[0], compilations[0]] }
      });
      assert.fail("Creation should have errored");
    } catch (error) {
      if (error.name !== "RepeatCompilationIdError") {
        throw error; //rethrow unexpected errors
      }
    }
  });

  it("should error on supplying two compilations with the same ID on adding", async function () {
    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { compilations: [] }
    });
    try {
      await decoder.addAdditionalProjectInfo({
        compilations: [compilations[0], compilations[0]]
      });
      assert.fail("Adding new should have errored");
    } catch (error) {
      if (error.name !== "RepeatCompilationIdError") {
        throw error; //rethrow unexpected errors
      }
    }
  });

  it("should error on supplying compilation with an existing ID", async function () {
    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { compilations }
    });
    try {
      await decoder.addAdditionalProjectInfo({ compilations });
      assert.fail("Adding new should have errored");
    } catch (error) {
      if (error.name !== "RepeatCompilationIdError") {
        throw error; //rethrow unexpected errors
      }
    }
  });
});
