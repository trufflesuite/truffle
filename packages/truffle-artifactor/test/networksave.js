const assert = require("chai").assert;
const Artifactor = require("../");
const temp = require("temp").track();
const contract = require("truffle-contract");
const path = require("path");
const fs = require("fs");
const requireNoCache = require("require-nocache")(module);

const firstNetworkObj = {
  3: { address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01" }
};
const secondNetworkObj = {
  2: { address: "0xe5e1652a0397e078f434d6dda181b218cfd42e01" }
};
const thirdNetworkObj = {
  2: { address: "0x6a90f4263739e4e20146ee4b5691d5b0fe5d48ec" }
};

let dirPath, expected_filepath;

describe("if artifact file doesn't already exist...", () => {
  before(() => {
    dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: "tmp-test-contract-"
    });
    expected_filepath = path.join(dirPath, "Example.json");
  });
  it("...artifactor merges a passed network object to json", done => {
    // make sure the artifact file doesn't already exist
    assert(!fs.existsSync(expected_filepath));

    artifactor = new Artifactor(dirPath);

    artifactor
      .save({
        contractName: "Example",
        abi: [],
        bytecode: "0xabcdef",
        networks: firstNetworkObj
      })
      .then(() => {
        const json = requireNoCache(expected_filepath);
        Example = contract(json);

        assert.deepStrictEqual(Example.networks, firstNetworkObj);
      })
      .then(done)
      .catch(done);
  });
});

describe("if artifact file already exists...", () => {
  it("...artifactor merges a different network object w/o overwriting an older one to json", done => {
    // make sure the artifact file already exists
    assert(fs.existsSync(expected_filepath));

    artifactor = new Artifactor(dirPath);

    artifactor
      .save({
        contractName: "Example",
        abi: [],
        bytecode: "0xabcdef",
        networks: secondNetworkObj
      })
      .then(() => {
        const json = requireNoCache(expected_filepath);
        Example = contract(json);

        assert.deepStrictEqual(Example.networks[2], secondNetworkObj[2]);
        assert.deepStrictEqual(Example.networks[3], firstNetworkObj[3]);
        assert.notDeepEqual(Example.networks[2], Example.networks[3]);
      })
      .then(done)
      .catch(done);
  });

  it("...artifactor overwrites an older network object using the same network_id to json", done => {
    // make sure the artifact file already exists
    assert(fs.existsSync(expected_filepath));

    artifactor = new Artifactor(dirPath);

    artifactor
      .save({
        contractName: "Example",
        abi: [],
        bytecode: "0xabcdef",
        networks: thirdNetworkObj
      })
      .then(() => {
        const json = requireNoCache(expected_filepath);
        Example = contract(json);

        assert.deepStrictEqual(Example.networks[2], thirdNetworkObj[2]);
        assert.notDeepEqual(Example.networks[2], secondNetworkObj[2]);
        assert.notDeepEqual(thirdNetworkObj, secondNetworkObj);
      })
      .then(done)
      .catch(done);
  });
});
