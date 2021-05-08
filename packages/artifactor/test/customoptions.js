const assert = require("chai").assert;
const Artifactor = require("../");
const contract = require("@truffle/contract");
const path = require("path");
const requireNoCache = require("require-nocache")(module);
const tmp = require("tmp");
tmp.setGracefulCleanup();

describe("Custom options", () => {
  it("allows custom options", (done) => {
    // Setup
    const tempDir = tmp.dirSync({
      unsafeCleanup: true,
      prefix: "tmp-test-contract-",
    });

    const expectedFilepath = path.join(tempDir.name, "Example.json");

    const artifactor = new Artifactor(tempDir.name);

    artifactor
      .save({
        "contractName": "Example",
        "abi": [],
        "bytecode": "0xabcdef",
        "networks": {
          3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" },
        },
        "x-from-dependency": "somedep",
      })
      .then(() => {
        const json = requireNoCache(expectedFilepath);
        const Example = contract(json);

        assert.equal(Example["x-from-dependency"], "somedep");
      })
      .then(done)
      .catch(done);
  });
});
