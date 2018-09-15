const path = require("path");
const fs = require("fs-extra");
const assert = require("assert");
const Box = require("../");
var TRUFFLE_BOX_DEFAULT = "git@github.com:trufflesuite/truffle-init-default.git";

describe("Unbox", function() {
  const destination = path.join(__dirname, ".truffle_test_tmp");

  before("mkdir", async() => fs.ensureDir(destination));
  after("remove tmp dir", async() => fs.remove(destination));

  it("unboxes truffle box from github", function() {
    this.timeout(5000);

    return Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
      .then(function (truffleConfig) {
        assert.ok(truffleConfig);

        assert(
          fs.existsSync(path.join(destination, "truffle.js")),
          "Unboxed project should have truffle config."
        );
      });
  });

  it("ignores files listed in the truffle-init.json file, and removes the truffle-init.json file", function() {
    // Assert the file is not there first.
    assert(fs.existsSync(path.join(destination, "truffle-init.json")) == false, "truffle-init.json shouldn't be available to the user!");

    // Now assert the README.md and the .gitignore file were removed.
    assert(fs.existsSync(path.join(destination, "README.md")) == false, "README.md didn't get removed!");
    assert(fs.existsSync(path.join(destination, ".gitignore")) == false, ".gitignore didn't get removed!");
  });

  it("won't re-init if anything exists in the destination folder", function(done) {
    this.timeout(5000);

    const contracts_directory = path.join(destination, "contracts");

    // Assert our precondition
    assert(fs.existsSync(contracts_directory), "contracts directory should exist for this test to be meaningful");

    fs.remove(contracts_directory).then(() => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
        .then(function(boxConfig) {
          assert(
            fs.existsSync(contracts_directory) == false,
            "Contracts directory got recreated when it shouldn't have"
          );
          done();
        })
        .catch(function(e) {
          if (e.message.indexOf("Something already exists at the destination.") >= 0) {
            done();
          } else {
            done(new Error("Unknown error received: " + e.stack));
          }
        });
    });
  });

  it("will re-init if force is true in the options and files exist", function(done) {
    this.timeout(5000);

    const truffleConfigPath = path.join(destination, "truffle.js");

    // Assert our precondition
    assert(fs.existsSync(truffleConfigPath), "truffle.js should exist for this test to be meaningful");

    fs.remove(truffleConfigPath).then(() => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true })
        .then((boxConfig) => {
          assert(fs.existsSync(truffleConfigPath) === true, "truffle.js got recreated");
          done();
        });
    });
  });
});
