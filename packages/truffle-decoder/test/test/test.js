const assert = require("assert");
const util = require("util"); // eslint-disable-line no-unused-vars

const TruffleDecoder = require("../../../truffle-decoder");

const DecodingSample = artifacts.require("DecodingSample");

function validateStructS(struct, values) {
  assert.equal(typeof struct, "object");
  assert.equal(struct.members.structInt.value.toString(), values[0]);
  assert.equal(struct.members.structString.value, values[1]);
  assert.equal(struct.members.structBool.value, values[2]);
  assert.equal(struct.members.structAddress.value, values[3]);

  const s2 = struct.members.structS2.value;
  validateStructS2(s2, values[4]);
}

function validateStructS2(s2, values) {
  assert.equal(typeof s2, "object");
  assert.equal(
    s2.members.structTwoFixedArrayUint.value[0].toString(),
    values[0]
  );
  assert.equal(
    s2.members.structTwoFixedArrayUint.value[1].toString(),
    values[1]
  );
  assert.equal(s2.members.structTwoDynamicArrayUint.value.length, values[2]);
  for (let i = 0; i < values[2]; i++) {
    assert.equal(
      s2.members.structTwoDynamicArrayUint.value[i].toString(),
      values[3 + i]
    );
  }
}

contract("DecodingSample", _accounts => {
  it("should get the initial state properly", async () => {
    let deployedContract = await DecodingSample.deployed();
    let address = deployedContract.address;
    const decoder = TruffleDecoder.forContract(
      DecodingSample,
      [],
      web3.currentProvider
    );
    await decoder.init();

    decoder.watchMappingKey("varMapping", 2);
    decoder.watchMappingKey("varMapping", 3);

    const initialState = await decoder.state();

    // used for debugging test results
    // console.log(
    //   util.inspect(initialState, {
    //     showHidden: false,
    //     depth: null,
    //     colors: true
    //   })
    // );

    assert.equal(initialState.name, "DecodingSample");
    const variables = initialState.variables;

    assert.notStrictEqual(typeof variables.varUint, "undefined");

    assert.equal(variables.varUint.value.toString(), "1");
    assert.equal(variables.varString.value, "two");
    assert.equal(variables.varBool.value, true);
    assert.equal(
      variables.varAddress.value,
      "0x12345567890abcDEffEDcBa09876543211337121"
    );
    assert.equal(variables.varBytes7.value, "0x78554477331122");
    assert.equal(variables.varBytes.value, "0x01030307");
    assert.equal(typeof variables.varEnum.value, "object");
    assert.equal(variables.varEnum.value.value, "E.EnumValTwo");

    const struct = variables.varStructS.value;
    validateStructS(struct, [
      "-2",
      "three",
      false,
      "0x54321567890abcdeFfEDcBA09876543211337121",
      ["4", "2", 3, "4", "8", "12"]
    ]);

    assert.equal(variables.fixedArrayUint.value[0].toString(), "16");
    assert.equal(variables.fixedArrayUint.value[1].toString(), "17");
    assert.equal(variables.fixedArrayString.value[0].toString(), "hello");
    assert.equal(variables.fixedArrayString.value[1].toString(), "world");
    assert.equal(variables.fixedArrayBool.value[0], true);
    assert.equal(variables.fixedArrayBool.value[1], false);
    assert.equal(
      variables.fixedArrayAddress.value[0].toString(),
      "0x98761567890ABCdeffEdCba09876543211337121"
    );
    assert.equal(
      variables.fixedArrayAddress.value[1].toString(),
      "0xfEDc1567890aBcDeFfEdcba09876543211337121"
    );
    assert.equal(
      variables.fixedArrayBytes7.value[0].toString(),
      "0x75754477331122"
    );
    assert.equal(
      variables.fixedArrayBytes7.value[1].toString(),
      "0xe7d14477331122"
    );
    assert.equal(variables.fixedArrayByte.value[0].toString(), "0x37");
    assert.equal(variables.fixedArrayByte.value[1].toString(), "0xbe");
    assert.equal(variables.fixedArrayEnum.value[0].value, "E.EnumValFour");
    assert.equal(variables.fixedArrayEnum.value[1].value, "E.EnumValTwo");

    assert.equal(variables.dynamicArrayUint.value[0].toString(), "16");
    assert.equal(variables.dynamicArrayUint.value[1].toString(), "17");
    assert.equal(variables.dynamicArrayString.value[0].toString(), "hello");
    assert.equal(variables.dynamicArrayString.value[1].toString(), "world");
    assert.equal(variables.dynamicArrayBool.value[0], true);
    assert.equal(variables.dynamicArrayBool.value[1], false);
    assert.equal(
      variables.dynamicArrayAddress.value[0].toString(),
      "0x98761567890ABCdeffEdCba09876543211337121"
    );
    assert.equal(
      variables.dynamicArrayAddress.value[1].toString(),
      "0xfEDc1567890aBcDeFfEdcba09876543211337121"
    );
    assert.equal(
      variables.dynamicArrayBytes7.value[0].toString(),
      "0x75754477331122"
    );
    assert.equal(
      variables.dynamicArrayBytes7.value[1].toString(),
      "0xe7d14477331122"
    );
    assert.equal(variables.dynamicArrayByte.value[0].toString(), "0x37");
    assert.equal(variables.dynamicArrayByte.value[1].toString(), "0xbe");
    assert.equal(variables.dynamicArrayEnum.value[0].value, "E.EnumValFour");
    assert.equal(variables.dynamicArrayEnum.value[1].value, "E.EnumValTwo");

    // const fixedStructArray = variables.fixedArrayStructS.value;

    assert.equal(variables.varMapping.value.members[2], 41);
    assert.equal(variables.varMapping.value.members[3], 107);

    assert.equal(
      variables.functionExternal.value,
      "DecodingSample(" + address + ").example"
    );
  });
});
