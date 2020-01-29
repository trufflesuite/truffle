const Config = require("@truffle/config");
const { assert } = require("chai");
const { run } = require("../run");
let rawSources, options;

describe("async run(rawSources, options)", () => {
  beforeEach(() => {
    rawSources = {
      "mockContractOne.sol":
        'pragma solidity ^0.5.0; import "gobbletygook"; ' +
        "contract MyContract { }",
      "mockContractTwo.sol":
        "pragma solidity ^0.5.0; contract MyOtherSource { " +
        " function someFunc() public { } }"
    };
    options = Config.default().merge({
      compilers: {
        solc: {
          settings: {
            remappings: [`gobbletygook=mockContractTwo.sol`]
          }
        }
      }
    });
  });

  describe("when remappings are provided in the options", () => {
    it("resolves them", async () => {
      try {
        const { contracts } = await run(rawSources, options);
        assert(contracts);
      } catch (error) {
        assert.fail(error);
      }
    });
  });
});
