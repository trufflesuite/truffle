const assert = require("assert");
const util = require("util");

const TruffleDecoder = require("../../../truffle-decoder");

const DecodingSample = artifacts.require("DecodingSample");

// eslint-disable-next-line no-unused-vars
contract("DecodingSample", accounts => {
  it("should get the initial state properly", async () => {
    await DecodingSample.deployed();
    const decoder = TruffleDecoder.forContract(
      DecodingSample,
      [],
      web3.currentProvider.host
    );
    decoder.init();

    const initialState = await decoder.state();

    console.log(
      util.inspect(initialState, {
        showHidden: false,
        depth: null,
        colors: true
      })
    );

    assert(initialState.name === "DecodingSample");
    const variables = initialState.variables;

    assert(typeof variables.varUint !== "undefined");

    assert(variables.varUint.value.toString() === "1");
    assert(variables.varString.value === "two");
    assert(variables.varBool.value === true);
    assert(
      variables.varAddress.value ===
        "0x12345567890abcdeffedcba09876543211337121"
    );
    assert(variables.varBytes7.value === "0x78554477331122");
    assert(variables.varBytes.value === "0x01030307");
    assert(typeof variables.varEnum.value === "object");
    assert(variables.varEnum.value.value === "E.EnumValTwo");
    assert(typeof variables.varStructS.value === "object");
    const struct = variables.varStructS.value;
    assert(struct.members.structInt.value.toString() === "-2");
    assert(struct.members.structString.value === "three");
    assert(struct.members.structBool.value === false);
    assert(
      struct.members.structAddress.value ===
        "0x54321567890abcdeffedcba09876543211337121"
    );

    const s2 = struct.members.structS2.value;
    assert(typeof s2 === "object");
    assert(s2.members.structTwoFixedArrayUint.value[0].toString() === "4");
    assert(s2.members.structTwoFixedArrayUint.value[1].toString() === "2");
    assert(s2.members.structTwoDynamicArrayUint.value.length === 3);
    assert(s2.members.structTwoDynamicArrayUint.value[0].toString() === "4");
    assert(s2.members.structTwoDynamicArrayUint.value[1].toString() === "8");
    assert(s2.members.structTwoDynamicArrayUint.value[2].toString() === "12");

    //await instance.generateMagicSquare(1, {from: accounts[0], value: web3.utils.toWei("0.1", "ether")});
    //await instance.generateMagicSquare(2, {from: accounts[0]});

    //const mappingValue = await decoder.mapping(contractState.variables["myMap"].value.id, [17]);
  });
});
