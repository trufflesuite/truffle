const path = require("path");
const fs = require("fs-extra");
const assert = require("assert");
const Box = require("../");
const TRUFFLE_BOX_DEFAULT = "git@github.com:trufflesuite/truffle-init-default.git";

describe("truffle-box Box", () => {
  describe(".unbox()", () => {
    const destination = path.join(__dirname, ".truffle_test_tmp");

    before("mkdir", async() => fs.ensureDir(destination));
    after("remove tmp dir", async() => fs.remove(destination));

    it("unboxes truffle box from github", () => {
      return Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
        .then(function (truffleConfig) {
          assert.ok(truffleConfig);

          assert(
            fs.existsSync(path.join(destination, "truffle.js")),
            "Unboxed project should have truffle config."
          );
        });
    }).timeout(5000);

    it("ignores files listed in the truffle-init.json file, and removes the truffle-init.json file", () => {
      // Assert the file is not there first.
      assert(fs.existsSync(path.join(destination, "truffle-init.json")) == false, "truffle-init.json shouldn't be available to the user!");

      // Now assert the README.md and the .gitignore file were removed.
      assert(fs.existsSync(path.join(destination, "README.md")) == false, "README.md didn't get removed!");
      assert(fs.existsSync(path.join(destination, ".gitignore")) == false, ".gitignore didn't get removed!");
    });

    it("prompts if init/unbox used and redundant files/folders exist in the target directory", (done) => {
      var EXPECTED_TIMEOUT = 5000;
      var timeout = setTimeout(done, EXPECTED_TIMEOUT);

      Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
        .then(function(boxConfig) {
          clearTimeout(timeout);
          done(new Error('Unexpected response'));
        });
    }).timeout(6000);

    it("allows init/unbox if force flag used and redundant files/folders exist in the target directory", (done) => {
      const truffleConfigPath = path.join(destination, "truffle.js");

      // Assert our precondition
      assert(fs.existsSync(truffleConfigPath), "truffle.js should exist for this test to be meaningful");

      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true })
        .then((boxConfig) => {
          assert(fs.existsSync(truffleConfigPath) === true, "truffle.js got recreated");
          done();
        });
    }).timeout(5000);
  });
});
