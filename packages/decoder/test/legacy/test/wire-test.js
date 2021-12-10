const debug = require("debug")("decoder:test:wire-test");
const assert = require("chai").assert;
const Ganache = require("ganache");
const path = require("path");
const Web3 = require("web3");

const Decoder = require("../../..");
const Codec = require("@truffle/codec");

const { prepareContracts } = require("../../helpers");

describe("Over-the-wire decoding (legacy features)", function () {
  let provider;
  let abstractions;
  let web3;

  let Contracts;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "decoder",
      gasLimit: 7000000,
      vmErrorsOnRPCResponse: true,
      legacyInstamine: true,
      quiet: true
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

    Contracts = [
      abstractions.LegacyWireTest,
      abstractions.LegacyWireTestParent,
      abstractions.LegacyWireTestAbstract
    ];
  });

  it("should decode overridden events & events inherited from abstract contracts", async function () {
    const deployedContract = await abstractions.LegacyWireTest.new();

    const decoder = await Decoder.forProject({
      provider: web3.currentProvider,
      projectInfo: { artifacts: Contracts }
    });

    const overrideTest = await deployedContract.interfaceAndOverrideTest();

    const overrideBlock = overrideTest.receipt.blockNumber;

    const overrideTestEvents = await decoder.events({
      fromBlock: overrideBlock,
      toBlock: overrideBlock
    });

    assert.lengthOf(overrideTestEvents, 5);

    assert.lengthOf(overrideTestEvents[0].decodings, 1);
    assert.strictEqual(overrideTestEvents[0].decodings[0].kind, "event");
    assert.strictEqual(
      overrideTestEvents[0].decodings[0].abi.name,
      "AbstractEvent"
    );
    assert.strictEqual(
      overrideTestEvents[0].decodings[0].class.typeName,
      "LegacyWireTest"
    );
    assert.strictEqual(
      overrideTestEvents[0].decodings[0].definedIn.typeName,
      "LegacyWireTestAbstract"
    );
    assert.isEmpty(overrideTestEvents[0].decodings[0].arguments);

    assert.lengthOf(overrideTestEvents[1].decodings, 1);
    assert.strictEqual(overrideTestEvents[1].decodings[0].kind, "event");
    assert.strictEqual(
      overrideTestEvents[1].decodings[0].abi.name,
      "AbstractOverridden"
    );
    assert.strictEqual(
      overrideTestEvents[1].decodings[0].class.typeName,
      "LegacyWireTest"
    );
    assert.strictEqual(
      overrideTestEvents[1].decodings[0].definedIn.typeName,
      "LegacyWireTest"
    );
    assert.lengthOf(overrideTestEvents[1].decodings[0].arguments, 1);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        overrideTestEvents[1].decodings[0].arguments[0].value
      ),
      107
    );

    assert.lengthOf(overrideTestEvents[2].decodings, 1);
    assert.strictEqual(overrideTestEvents[2].decodings[0].kind, "event");
    assert.strictEqual(
      overrideTestEvents[2].decodings[0].abi.name,
      "AbstractOverridden"
    );
    assert.strictEqual(
      overrideTestEvents[2].decodings[0].class.typeName,
      "LegacyWireTest"
    );
    assert.strictEqual(
      overrideTestEvents[2].decodings[0].definedIn.typeName,
      "LegacyWireTestAbstract"
    );
    assert.lengthOf(overrideTestEvents[2].decodings[0].arguments, 1);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        overrideTestEvents[2].decodings[0].arguments[0].value
      ),
      683
    );

    assert.lengthOf(overrideTestEvents[3].decodings, 1);
    assert.strictEqual(overrideTestEvents[3].decodings[0].kind, "event");
    assert.strictEqual(
      overrideTestEvents[3].decodings[0].abi.name,
      "Overridden"
    );
    assert.strictEqual(
      overrideTestEvents[3].decodings[0].class.typeName,
      "LegacyWireTest"
    );
    assert.strictEqual(
      overrideTestEvents[3].decodings[0].definedIn.typeName,
      "LegacyWireTest"
    );
    assert.lengthOf(overrideTestEvents[3].decodings[0].arguments, 1);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        overrideTestEvents[3].decodings[0].arguments[0].value
      ),
      107
    );

    assert.lengthOf(overrideTestEvents[4].decodings, 1);
    assert.strictEqual(overrideTestEvents[4].decodings[0].kind, "event");
    assert.strictEqual(
      overrideTestEvents[4].decodings[0].abi.name,
      "Overridden"
    );
    assert.strictEqual(
      overrideTestEvents[4].decodings[0].class.typeName,
      "LegacyWireTest"
    );
    assert.strictEqual(
      overrideTestEvents[4].decodings[0].definedIn.typeName,
      "LegacyWireTestParent"
    );
    assert.lengthOf(overrideTestEvents[4].decodings[0].arguments, 1);
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(
        overrideTestEvents[4].decodings[0].arguments[0].value
      ),
      683
    );
  });
});
