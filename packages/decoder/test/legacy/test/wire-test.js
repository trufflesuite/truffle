const debug = require("debug")("decoder:test:wire-test");
const assert = require("chai").assert;

const Decoder = require("../../..");
const Codec = require("@truffle/codec");

const LegacyWireTest = artifacts.require("LegacyWireTest");
const LegacyWireTestParent = artifacts.require("LegacyWireTestParent");
const LegacyWireTestAbstract = artifacts.require("LegacyWireTestAbstract");

contract("LegacyWireTest", function (_accounts) {
  it("should decode overridden events & events inherited from abstract contracts", async function () {
    const deployedContract = await LegacyWireTest.new();

    const decoder = await Decoder.forProject(web3.currentProvider, [
      LegacyWireTest,
      LegacyWireTestParent,
      LegacyWireTestAbstract
    ]);

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
      Codec.Format.Utils.Inspect.nativize(
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
      Codec.Format.Utils.Inspect.nativize(
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
      Codec.Format.Utils.Inspect.nativize(
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
      Codec.Format.Utils.Inspect.nativize(
        overrideTestEvents[4].decodings[0].arguments[0].value
      ),
      683
    );
  });
});
