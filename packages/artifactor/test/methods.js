const assert = require("assert");
const sinon = require("sinon");
const Artifactor = require("../");

describe("Artifactor.save", () => {
  it("throws if passed an artifact without a contractName", () => {
    artifactor = new Artifactor("/some/path");

    artifactor
      .save({
        "abi": [],
        "bytecode": "0xabcdef",
        "networks": {
          3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" },
        },
        "x-from-dependency": "somedep",
      })
      .then(() => assert(false, "didn't throw!"))
      .catch((e) => assert(e.message.includes("must specify a contract name")));
  });
});

describe("Artifactor.saveAll", () => {
  it("warns if there are duplicate contract names and input is an array", () => {
    let consoleWarnSpy = sinon.spy(console, "warn");
    artifactor = new Artifactor("/some/path");

    artifactor
      .saveAll([
        {
          "contractName": "Example",
          "abi": [],
          "bytecode": "0xabcdef",
          "networks": {
            3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" },
          },
          "x-from-dependency": "somedep",
        },
        {
          "contractName": "Example",
          "abi": [],
          "bytecode": "0xdeadbeef",
          "networks": {
            3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" },
          },
          "x-from-dependency": "somedep",
        },
      ])
      .then(() => {
        assert.isTrue(consoleWarnSpy.called, "No warning emitted");
        assert.isTrue(
          consoleWarnSpy.calledWithMatch(/Duplicate contract names/),
          "Wrong warning message"
        );
      });
  });

  it("throws if this.destination doesn't exist", () => {
    artifactor = new Artifactor("/some/path");

    artifactor
      .saveAll({
        "contractName": "Example",
        "abi": [],
        "bytecode": "0xabcdef",
        "networks": {
          3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" },
        },
        "x-from-dependency": "somedep",
      })
      .then(() => assert(false, "didn't throw!"))
      .catch((e) => {
        assert(e.message.includes("doesn't exist!"));
      });
  });

  it("throws if this.destination doesn't exist(array passed)", () => {
    artifactor = new Artifactor("/some/path");

    artifactor
      .saveAll([
        {
          "contractName": "Example",
          "abi": [],
          "bytecode": "0xabcdef",
          "networks": {
            3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" },
          },
          "x-from-dependency": "somedep",
        },
      ])
      .then(() => assert(false, "didn't throw!"))
      .catch(e => {
        assert(e.message.includes("doesn't exist!"));
      });
  });
});
