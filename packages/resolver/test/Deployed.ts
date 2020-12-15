import assert from "assert";
import { Deployed } from "../lib/sources/truffle/Deployed";
import { describe, it } from "mocha";
let address, version;

describe("Deployed", () => {
  describe("makeSolidityDeployedAddressesLibrary", () => {
    it("creates the deployed addresses library", () => {
      address = "0x1234567890123456789012345678901234567890";
      version = "0.6.0";
      const result = Deployed.makeSolidityDeployedAddressesLibrary(
        {
          HamburgerContract: address
        },
        {
          solc: { version }
        }
      );
      assert(result.includes(address));
      assert(result.includes("HamburgerContract"));
    });

    it("can deal with 'pragma' specified as version", () => {
      version = "pragma";
      address = "0x1234567890123456789012345678901234567890";
      const result = Deployed.makeSolidityDeployedAddressesLibrary(
        {
          CheeseburgerContract: address
        },
        {
          solc: { version }
        }
      );
      assert(result.includes(address));
      assert(result.includes("CheeseburgerContract"))
    });
  });
});
