const path = require("path");
const fs = require("fs-extra");
const assert = require("assert");
const Box = require("../");
const TRUFFLE_BOX_DEFAULT = "git@github.com:trufflesuite/truffle-init-default.git";

describe("Unbox", () => {
  const destination = path.join(__dirname, ".truffle_test_tmp");

  before("mkdir", (done) => {
    fs.ensureDir(destination, done);
  });

  after("remove tmp dir", (done) => {
    fs.remove(destination, done);
  });

  it("unboxes truffle box from github", (done) => {
    Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
      .then((truffleConfig) => {
        assert.ok(truffleConfig);

        assert(
          fs.existsSync(path.join(destination, "truffle-config.js")),
          "Unboxed project should have truffle config."
        );
        done();
      });
  }).timeout(5000);

  it("ignores files listed in the truffle-box.json file, and removes the truffle-box.json file", () => {
    // Assert the file is not there first.
    assert(fs.existsSync(path.join(destination, "truffle-box.json")) == false, "truffle-box.json shouldn't be available to the user!");

    // Now assert the README.md and the .gitignore file were removed.
    assert(fs.existsSync(path.join(destination, "README.md")) == false, "README.md didn't get removed!");
    assert(fs.existsSync(path.join(destination, ".gitignore")) == false, ".gitignore didn't get removed!");
  });

  it("won't re-init if anything exists in the destination folder", (done) => {
    const contracts_directory = path.join(destination, "contracts");

    // Assert our precondition
    assert(fs.existsSync(contracts_directory), "contracts directory should exist for this test to be meaningful");

    fs.remove(contracts_directory, (err) => {
      if (err) return done(err);

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
  }).timeout(5000);
});
