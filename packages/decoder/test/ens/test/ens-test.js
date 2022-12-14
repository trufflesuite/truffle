const debug = require("debug")("decoder:test:decoding-test");
const assert = require("chai").assert;
const Ganache = require("ganache");
const path = require("path");

const Decoder = require("../../..");
const { prepareContracts } = require("../../helpers");

describe("ENS reverse resolution", function () {
  let provider;
  let abstractions;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      miner: { instamine: "strict" },
      seed: "decoder",
      gasLimit: 7000000,
      logging: { quiet: true }
    });
  });

  after(async () => {
    provider && (await provider.disconnect());
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(60000);

    const prepared = await prepareContracts(
      provider,
      path.resolve(__dirname, "..")
    );
    abstractions = prepared.abstractions;
  });

  it("should perform ENS reverse resolution", async function () {
    const deployedContract = await abstractions.EnsTest.deployed();
    const registryAddress = await deployedContract.registryAddress();
    const decoder = await Decoder.forContractInstance(deployedContract, {
      ens: { registryAddress }
    });
    const namedAddressResult = await decoder.variable("namedAddress");
    assert.property(namedAddressResult.interpretations, "ensName");
    assert.equal(namedAddressResult.interpretations.ensName.kind, "valid");
    assert.equal(
      namedAddressResult.interpretations.ensName.asString,
      "myexample.eth"
    );
  });

  it("should not perform ENS reverse resolution if turned off", async function () {
    const deployedContract = await abstractions.EnsTest.deployed();
    const registryAddress = await deployedContract.registryAddress();
    const decoder = await Decoder.forContractInstance(deployedContract, {
      ens: { provider: null, registryAddress }
    }); //set null provider to turn it off
    const namedAddressResult = await decoder.variable("namedAddress");
    assert.notProperty(namedAddressResult.interpretations, "ensName");
  });
});
