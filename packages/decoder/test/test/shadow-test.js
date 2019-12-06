const debug = require("debug")("decoder:test:shadow-test");
const assert = require("chai").assert;

const Decoder = require("../..");
const Codec = require("../../../codec");

const ShadowBase = artifacts.require("ShadowBase");
const ShadowDerived = artifacts.require("ShadowDerived");

contract("ShadowDerived", function(_accounts) {
  it("Fetches variables by name or qualified name", async function() {
    let deployedContract = await ShadowDerived.deployed();
    let decoder = await Decoder.forContractInstance(deployedContract, [
      ShadowBase
    ]);

    const expectedBaseX = 1;
    const expectedBaseY = 2;
    const expectedDerivedX = 3;
    const expectedDerivedZ = 4;

    let decodedX = await decoder.variable("x");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.nativize(decodedX),
      expectedDerivedX
    );
    let decodedY = await decoder.variable("y");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.nativize(decodedY),
      expectedBaseY
    );
    let decodedZ = await decoder.variable("z");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.nativize(decodedZ),
      expectedDerivedZ
    );
    let decodedBaseX = await decoder.variable("ShadowBase.x");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.nativize(decodedBaseX),
      expectedBaseX
    );
    let decodedDerivedX = await decoder.variable("ShadowDerived.x");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.nativize(decodedDerivedX),
      expectedDerivedX
    );
    let decodedBaseY = await decoder.variable("ShadowBase.y");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.nativize(decodedBaseY),
      expectedBaseY
    );
    let decodedDerivedZ = await decoder.variable("ShadowDerived.z");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.nativize(decodedDerivedZ),
      expectedDerivedZ
    );
  });
});
