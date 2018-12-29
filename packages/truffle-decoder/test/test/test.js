const assert = require("assert");
const util = require("util"); // eslint-disable-line no-unused-vars

const TruffleDecoder = require("../../../truffle-decoder");

const DecodingSample = artifacts.require("DecodingSample");

// eslint-disable-next-line no-unused-vars
contract("DecodingSample", accounts => {
  it("should get the initial state properly", async () => {
    await DecodingSample.deployed();
    const decoder = TruffleDecoder.forContract(
      DecodingSample,
      [],
      web3.currentProvider
    );
    decoder.init();

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
      "0x12345567890abcdeffedcba09876543211337121"
    );
    assert.equal(variables.varBytes7.value, "0x78554477331122");
    assert.equal(variables.varBytes.value, "0x01030307");
    assert.equal(typeof variables.varEnum.value, "object");
    assert.equal(variables.varEnum.value.value, "E.EnumValTwo");
    assert.equal(typeof variables.varStructS.value, "object");
    const struct = variables.varStructS.value;
    assert.equal(struct.members.structInt.value.toString(), "-2");
    assert.equal(struct.members.structString.value, "three");
    assert.equal(struct.members.structBool.value, false);
    assert.equal(
      struct.members.structAddress.value,
      "0x54321567890abcdeffedcba09876543211337121"
    );

    assert.equal(variables.fixedArrayUint.value.toString(), "16,17");

    // const s2 = struct.members.structS2.value;
    // assert.equal(typeof s2, "object");
    // assert.equal(s2.members.structTwoFixedArrayUint.value[0].toString(), "4");
    // assert.equal(s2.members.structTwoFixedArrayUint.value[1].toString(), "2");
    // assert.equal(s2.members.structTwoDynamicArrayUint.value.length, 3);
    // assert.equal(s2.members.structTwoDynamicArrayUint.value[0].toString(), "4");
    // assert.equal(s2.members.structTwoDynamicArrayUint.value[1].toString(), "8");
    // assert.equal(s2.members.structTwoDynamicArrayUint.value[2].toString(), "12");

    // await instance.generateMagicSquare(1, {from: accounts[0], value: web3.utils.toWei("0.1", "ether")});
    // await instance.generateMagicSquare(2, {from: accounts[0]});

    // const mappingValue = await decoder.mapping(contractState.variables["myMap"].value.id, [17]);
  });
});
