import Config from "@truffle/config";
import { describe, it, beforeEach } from "mocha";
import { assert } from "chai";
import { run } from "@truffle/compile-solidity";
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
      const result = await run(rawSources, options);
      assert.isNotNull(result);
      assert.isDefined(result);
      assert.isDefined(result!.contracts);
    });
  });
});
