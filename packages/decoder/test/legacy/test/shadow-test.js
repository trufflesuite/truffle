const debug = require("debug")("decoder:test:shadow-test");
const assert = require("chai").assert;
const Ganache = require("ganache");
const path = require("path");

const Decoder = require("../../..");
const Codec = require("@truffle/codec");

const { prepareContracts } = require("../../helpers");

describe("Shadowed storage variables", function () {
  let provider;
  let abstractions;

  before("Create Provider", async function () {
    provider = Ganache.provider({ seed: "decoder", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    const prepared = await prepareContracts(
      provider,
      path.resolve(__dirname, "..")
    );
    abstractions = prepared.abstractions;
  });

  it("Includes shadowed storage variables in variables", async function () {
    let deployedContract = await abstractions.ShadowDerived.deployed();
    let decoder = await Decoder.forContractInstance(deployedContract, {
      projectInfo: {
        artifacts: [abstractions.ShadowBase, abstractions.ShadowDerived]
      }
    });

    let variables = await decoder.variables();

    assert.equal(variables[0].class.typeName, "ShadowBase");
    assert.equal(variables[1].class.typeName, "ShadowBase");
    assert.equal(variables[2].class.typeName, "ShadowDerived");
    assert.equal(variables[3].class.typeName, "ShadowDerived");
  });

  it("Fetches variables by name or qualified name", async function () {
    let deployedContract = await abstractions.ShadowDerived.deployed();
    let decoder = await Decoder.forContractInstance(deployedContract, {
      projectInfo: {
        artifacts: [abstractions.ShadowBase, abstractions.ShadowDerived]
      }
    });

    const expectedBaseX = 1;
    const expectedBaseY = 2;
    const expectedDerivedX = 3;
    const expectedDerivedZ = 4;

    let decodedX = await decoder.variable("x");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decodedX),
      expectedDerivedX
    );
    let decodedY = await decoder.variable("y");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decodedY),
      expectedBaseY
    );
    let decodedZ = await decoder.variable("z");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decodedZ),
      expectedDerivedZ
    );
    let decodedBaseX = await decoder.variable("ShadowBase.x");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decodedBaseX),
      expectedBaseX
    );
    let decodedDerivedX = await decoder.variable("ShadowDerived.x");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decodedDerivedX),
      expectedDerivedX
    );
    let decodedBaseY = await decoder.variable("ShadowBase.y");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decodedBaseY),
      expectedBaseY
    );
    let decodedDerivedZ = await decoder.variable("ShadowDerived.z");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(decodedDerivedZ),
      expectedDerivedZ
    );
  });
});
