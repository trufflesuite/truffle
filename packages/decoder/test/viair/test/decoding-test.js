const debug = require("debug")("decoder:test:decoding-test");
const assert = require("assert");
const Ganache = require("ganache");
const path = require("path");

const Decoder = require("../../..");
const {
  prepareContracts,
  unsafeNativizeDecoderVariables
} = require("../../helpers");

describe("State variable decoding with viaIR", function () {
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
    this.timeout(50000);

    const prepared = await prepareContracts(
      provider,
      path.resolve(__dirname, "..")
    );
    abstractions = prepared.abstractions;
  });

  it("decodes internal function pointers with viaIR", async function () {
    let deployedContract = await abstractions.DecodingSample.deployed();
    const decoder = await Decoder.forContractInstance(deployedContract);

    const initialVariables = await decoder.variables();

    const variables = unsafeNativizeDecoderVariables(initialVariables);

    assert.equal(variables.functionInternal, "DecodingSample.example");
  });
});
