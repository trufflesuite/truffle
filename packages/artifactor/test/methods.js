const assert = require("assert");
const Artifactor = require("../");

describe("Artifactor.save", () => {
  it("throws if passed an artifact without a contractName", () => {
    artifactor = new Artifactor("/some/path");

    artifactor
      .save({
        "abi": [],
        "bytecode": "0xabcdef",
        "networks": {
          3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" }
        },
        "x-from-dependency": "somedep"
      })
      .then(() => assert(false, "didn't throw!"))
      .catch(e => assert(e.message.includes("must specify a contract name")));
  });
});

describe("Artifactor.saveAll", () => {
  it("throws if this.destination doesn't exist", () => {
    artifactor = new Artifactor("/some/path");

    artifactor
      .saveAll({
        "contractName": "Example",
        "abi": [],
        "bytecode": "0xabcdef",
        "networks": {
          3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" }
        },
        "x-from-dependency": "somedep"
      })
      .then(() => assert(false, "didn't throw!"))
      .catch(e => {
        assert(e.message.includes("doesn't exist!"));
      });
  });
});
