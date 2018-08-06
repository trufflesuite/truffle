const { promisify } = require("util");
const temp = require("temp").track();
const assert = require("chai").assert;

const { processTarget, DEFAULT_ABI } = require("..");

describe("Compilation Targets", () => {
  let outputDir;

  before("make temporary directory", async () => {
    outputDir = await promisify(temp.mkdir)("external-targets");
  });

  describe("Property outputs", () => {
    it("includes default ABI when not specified", async () => {
      const contractName = "MyContract";
      const abi = DEFAULT_ABI;

      const target = {
        properties: {
          contractName
        }
      };

      const expected = {
        [contractName]: { contractName, abi },
      };

      const actual = await processTarget(target, outputDir);

      assert.deepEqual(expected, actual);
    });
  });
});
