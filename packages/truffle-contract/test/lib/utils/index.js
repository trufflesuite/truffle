const ens = require("../../../lib/utils/ens");
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
const args = ["my.ens.name", 555, { from: "the.other.name" }];

describe("convertENSNames", () => {
  beforeEach(() => {
    const expectedInput1 = "my.ens.name";
    const expectedInput2 = "the.other.name";
    sinon.stub(ens, "getNewENSJS").returns({
      resolver: input => {
        if (input === expectedInput1) {
          return { addr: () => Promise.resolve("0x123") };
        }
        if (input === expectedInput2) {
          return { addr: () => Promise.resolve("0x987") };
        }
        return Promise.reject("The input was not what was expected");
      }
    });
  });
  afterEach(() => {
    ens.getNewENSJS.restore();
  });

  it("converts ens names in address fields to addresses", async () => {
    let result = await ens.convertENSNames(args, methodABI, Web3);
    assert(result[0] === "0x123");
  });
  it("does not change non-address arguments", async () => {
    let result = await ens.convertENSNames(args, methodABI, Web3);
    assert(result[1] === 555);
  });
  it("converts ens names in the from field of the tx object", async () => {
    let result = await ens.convertENSNames(args, methodABI, Web3);
    assert(result[2].from === "0x987");
  });
});
