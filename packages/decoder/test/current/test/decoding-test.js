const debug = require("debug")("decoder:test:decoding-test");
const assert = require("assert");
const util = require("util"); // eslint-disable-line no-unused-vars

const Decoder = require("../../..");
const { nativizeDecoderVariables } = require("../../../dist/utils");

const DecodingSample = artifacts.require("DecodingSample");

function validateStructS(struct, values) {
  assert.equal(typeof struct, "object");
  assert.equal(struct.structInt.toString(), values[0]);
  assert.equal(struct.structString, values[1]);
  assert.equal(struct.structBool, values[2]);
  assert.equal(struct.structAddress, values[3]);

  const s2 = struct.structS2;
  validateStructS2(s2, values[4]);
}

function validateStructS2(s2, values) {
  assert.equal(typeof s2, "object");
  assert.equal(s2.structTwoFixedArrayUint[0].toString(), values[0]);
  assert.equal(s2.structTwoFixedArrayUint[1].toString(), values[1]);
  assert.equal(s2.structTwoDynamicArrayUint.length, values[2]);
  for (let i = 0; i < values[2]; i++) {
    assert.equal(s2.structTwoDynamicArrayUint[i].toString(), values[3 + i]);
  }
}

contract("DecodingSample", _accounts => {
  it("should get the initial state properly", async function() {
    let deployedContract = await DecodingSample.deployed();
    let address = deployedContract.address;
    const decoder = await Decoder.forContractInstance(deployedContract);

    await decoder.watchMappingKey("varMapping", 2);
    await decoder.watchMappingKey("varMapping", 3);
    await decoder.watchMappingKey("varAddressMapping", address);
    await decoder.watchMappingKey("varContractMapping", address);
    await decoder.watchMappingKey(
      "varEnumMapping",
      "DecodingSample.E.EnumValOne"
    );
    await decoder.watchMappingKey("varEnumMapping", "EnumValTwo");
    await decoder.watchMappingKey("varEnumMapping", "3");
    await decoder.watchMappingKey("varEnumMapping", 4);

    const initialState = await decoder.state();
    const initialVariables = await decoder.variables();

    debug("initialVariables: %O", initialVariables);

    assert.equal(initialState.class.typeName, "DecodingSample");

    const variables = nativizeDecoderVariables(initialVariables);

    assert.notStrictEqual(typeof variables.varUint, "undefined");

    assert.equal(variables.varUint.toString(), "1");
    assert.equal(variables.varString, "two");
    assert.equal(variables.varBool, true);
    assert.equal(
      variables.varAddress,
      "0x12345567890abcDEffEDcBa09876543211337121"
    );
    assert.equal(variables.varBytes7, "0x78554477331122");
    assert.equal(variables.varBytes, "0x01030307");
    assert.equal(typeof variables.varEnum, "string");
    assert.equal(variables.varEnum, "DecodingSample.E.EnumValTwo");

    const struct = variables.varStructS;
    validateStructS(struct, [
      "-2",
      "three",
      false,
      "0x54321567890abcdeFfEDcBA09876543211337121",
      ["4", "2", 3, "4", "8", "12"]
    ]);

    assert.equal(variables.fixedArrayUint[0].toString(), "16");
    assert.equal(variables.fixedArrayUint[1].toString(), "17");
    assert.equal(variables.fixedArrayString[0].toString(), "hello");
    assert.equal(variables.fixedArrayString[1].toString(), "world");
    assert.equal(variables.fixedArrayBool[0], true);
    assert.equal(variables.fixedArrayBool[1], false);
    assert.equal(
      variables.fixedArrayAddress[0].toString(),
      "0x98761567890ABCdeffEdCba09876543211337121"
    );
    assert.equal(
      variables.fixedArrayAddress[1].toString(),
      "0xfEDc1567890aBcDeFfEdcba09876543211337121"
    );
    assert.equal(variables.fixedArrayBytes7[0].toString(), "0x75754477331122");
    assert.equal(variables.fixedArrayBytes7[1].toString(), "0xe7d14477331122");
    assert.equal(variables.fixedArrayByte[0].toString(), "0x37");
    assert.equal(variables.fixedArrayByte[1].toString(), "0xbe");
    assert.equal(variables.fixedArrayEnum[0], "DecodingSample.E.EnumValFour");
    assert.equal(variables.fixedArrayEnum[1], "DecodingSample.E.EnumValTwo");

    assert.equal(variables.dynamicArrayUint[0].toString(), "16");
    assert.equal(variables.dynamicArrayUint[1].toString(), "17");
    assert.equal(variables.dynamicArrayString[0].toString(), "hello");
    assert.equal(variables.dynamicArrayString[1].toString(), "world");
    assert.equal(variables.dynamicArrayBool[0], true);
    assert.equal(variables.dynamicArrayBool[1], false);
    assert.equal(
      variables.dynamicArrayAddress[0].toString(),
      "0x98761567890ABCdeffEdCba09876543211337121"
    );
    assert.equal(
      variables.dynamicArrayAddress[1].toString(),
      "0xfEDc1567890aBcDeFfEdcba09876543211337121"
    );
    assert.equal(
      variables.dynamicArrayBytes7[0].toString(),
      "0x75754477331122"
    );
    assert.equal(
      variables.dynamicArrayBytes7[1].toString(),
      "0xe7d14477331122"
    );
    assert.equal(variables.dynamicArrayByte[0].toString(), "0x37");
    assert.equal(variables.dynamicArrayByte[1].toString(), "0xbe");
    assert.equal(variables.dynamicArrayEnum[0], "DecodingSample.E.EnumValFour");
    assert.equal(variables.dynamicArrayEnum[1], "DecodingSample.E.EnumValTwo");

    // const fixedStructArray = variables.fixedArrayStructS;

    assert.equal(variables.varMapping[2], 41);
    assert.equal(variables.varMapping[3], 107);
    assert.equal(variables.varAddressMapping[address], 683);
    assert.equal(variables.varContractMapping[address], 2049);
    assert.equal(variables.varEnumMapping["DecodingSample.E.EnumValOne"], 1);
    assert.equal(variables.varEnumMapping["DecodingSample.E.EnumValTwo"], 2);
    assert.equal(variables.varEnumMapping["DecodingSample.E.EnumValThree"], 3);
    assert.equal(variables.varEnumMapping["DecodingSample.E.EnumValFour"], 4);

    assert.equal(
      variables.functionExternal,
      "DecodingSample(" + address + ").example"
    );
  });
});
