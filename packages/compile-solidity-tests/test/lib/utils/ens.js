const ens = require("@truffle/contract/lib/utils/ens");
const assert = require("assert");
const sinon = require("sinon");
const Web3 = require("web3");
const methodABI = {
  constant: true,
  inputs: [
    {
      name: "firstInput",
      type: "address"
    },
    {
      name: "secondInput",
      type: "uint256"
    }
  ],
  name: "myMethod",
  outputs: [
    {
      name: "",
      type: "bool"
    }
  ],
  payable: false,
  stateMutability: "pure",
  type: "function"
};
const txParams = {
  from: "the.other.name",
  accessList: [
    {
      address: "third.party",
      storageKeys: []
    }
  ]
};
const args = ["my.ens.name", 555, txParams];
const ensSettings = { enabled: true };
const networkId = 1;

describe("convertENSNames", () => {
  beforeEach(() => {
    const expectedInput1 = "my.ens.name";
    const expectedInput2 = "the.other.name";
    const expectedInput3 = "third.party";
    sinon.stub(ens, "getNewENSJS").returns({
      name: input => {
        if (input === expectedInput1) {
          return { getAddress: () => Promise.resolve("0x123") };
        }
        if (input === expectedInput2) {
          return { getAddress: () => Promise.resolve("0x987") };
        }
        if (input === expectedInput3) {
          return { getAddress: () => Promise.resolve("0xabc") };
        }
        return Promise.reject("The input was not what was expected");
      }
    });
  });
  afterEach(() => {
    ens.getNewENSJS.restore();
  });

  it("converts ens names in address fields to addresses", async () => {
    let result = await ens.convertENSNames({
      networkId,
      inputArgs: args,
      ens: ensSettings,
      methodABI,
      web3: Web3
    });
    assert(result.args[0] === "0x123");
  });
  it("does not change non-address arguments", async () => {
    let result = await ens.convertENSNames({
      networkId,
      inputArgs: args,
      ens: ensSettings,
      methodABI,
      web3: Web3
    });
    assert(result.args[1] === 555);
  });
  it("converts ens names in the from field and the access list of the tx object", async () => {
    let result = await ens.convertENSNames({
      networkId,
      inputArgs: args,
      inputParams: txParams,
      ens: ensSettings,
      methodABI,
      web3: Web3
    });
    assert.equal(result.params.from, "0x987");
    assert(Array.isArray(result.params.accessList));
    assert.equal(result.params.accessList.length, 1);
    assert.equal(result.params.accessList[0].address, "0xabc");
    assert(Array.isArray(result.params.accessList[0].storageKeys));
    assert.equal(result.params.accessList[0].storageKeys.length, 0);
  });
});
