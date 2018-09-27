const path = require("path");
const fs = require("fs-extra");
const assert = require("assert");
const inquirer = require('inquirer');
const sinon = require('sinon');
const Box = require("../");
const TRUFFLE_BOX_DEFAULT = "git@github.com:trufflesuite/truffle-init-default.git";

describe("truffle-box Box", () => {

  beforeEach(() => {
    sinon.stub(inquirer, "prompt").returns({ then: () => console.log('Overwrite file?') });
  });
  afterEach(() => {
    inquirer.prompt.restore();
  });

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

    it("prompts if init/unbox used and redundant files/folders exist in target directory", (done) => {

      Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
        .then(function(boxConfig) {
          assert.strictEqual(inquirer.prompt.called, true);
          assert.strictEqual(inquirer.prompt.callCount, 4);
          done();
        });
    }).timeout(5000);

    it("allows init/unbox if force flag used", (done) => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true })
        .then((boxConfig) => {
          done();
        });
    }).timeout(5000);

    it("doesn't prompt if init/unbox force flag used", (done) => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true })
        .then((boxConfig) => {
          assert.strictEqual(inquirer.prompt.called, false);
          done();
        });
    }).timeout(5000);

    it("overwrites redundant files if init/unbox force flag used", (done) => {
      const truffleConfigPath = path.join(destination, "truffle.js");

      // preconditions
      fs.writeFileSync(truffleConfigPath, "this truffle.js file is different than the default box file", "utf8");
      assert(fs.existsSync(truffleConfigPath), "mock truffle.js wasn't created!");
      const mockConfig = fs.readFileSync(truffleConfigPath, "utf8");

      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true })
        .then((boxConfig) => {
          assert(fs.existsSync(truffleConfigPath), "truffle.js wasn't recreated!");
          const newConfig = fs.readFileSync(truffleConfigPath, "utf8");
          assert(newConfig !== mockConfig, "truffle.js wasn't overwritten!");
          done();
        });
    }).timeout(5000);
  });
});
