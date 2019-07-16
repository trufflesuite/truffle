const assert = require("chai").assert;
const Artifactor = require("../");
const temp = require("temp").track();
const contract = require("truffle-contract");
const path = require("path");
const requireNoCache = require("require-nocache")(module);

describe("Custom options", () => {
  it("allows custom options", done => {
    // Setup
    const dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: "tmp-test-contract-"
    });

    const expected_filepath = path.join(dirPath, "Example.json");

    artifactor = new Artifactor(dirPath);

    artifactor
      .save({
        "contractName": "Example",
        "abi": [],
        "bytecode": "0xabcdef",
        "networks": {
          3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" }
        },
        "x-from-dependency": "somedep"
      })
      .then(() => {
        const json = requireNoCache(expected_filepath);
        Example = contract(json);

        assert.equal(Example["x-from-dependency"], "somedep");
      })
      .then(done)
      .catch(done);
  });
});
