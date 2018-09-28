const path = require("path");
const fs = require("fs-extra");
const assert = require("assert");
const inquirer = require("inquirer");
const sinon = require("sinon");
const Box = require("../");
const TRUFFLE_BOX_DEFAULT = "git@github.com:trufflesuite/truffle-init-default.git";

describe("truffle-box Box", () => {

  const destination = path.join(__dirname, ".truffle_test_tmp");

  beforeEach(() => {
    sinon.stub(inquirer, "prompt").returns({ then: () => 1 });
    fs.ensureDirSync(destination);
  });
  afterEach(() => {
    inquirer.prompt.restore();
    fs.removeSync(destination);
  });

  describe(".unbox()", () => {

    it("unboxes truffle box from github", () => {
      return Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
        .then((truffleConfig) => {
          assert.ok(truffleConfig);

          assert(
            fs.existsSync(path.join(destination, "truffle.js")),
            "Unboxed project should have truffle config."
          );
        });
    });

    it("ignores files listed in the truffle-init.json file, and removes the truffle-init.json file", () => {
      // Assert the file is not there first.
      assert(fs.existsSync(path.join(destination, "truffle-init.json")) == false, "truffle-init.json shouldn't be available to the user!");

      // Now assert the README.md and the .gitignore file were removed.
      assert(fs.existsSync(path.join(destination, "README.md")) == false, "README.md didn't get removed!");
      assert(fs.existsSync(path.join(destination, ".gitignore")) == false, ".gitignore didn't get removed!");
    });
  });

  describe("--force", () => {

    it("unboxes truffle box when used", (done) => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true })
        .then((truffleConfig) => {
          assert.ok(truffleConfig);

          assert(
            fs.existsSync(path.join(destination, "truffle.js")),
            "Unboxed project should have truffle config."
          );
          done();
        });
    });

    it("runs without a prompt", (done) => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true })
        .then(() => {
          assert.strictEqual(inquirer.prompt.called, false);
          done();
        });
    });

    it("overwrites redundant files if init/unbox force flag used", (done) => {
      const truffleConfigPath = path.join(destination, "truffle.js");

      // preconditions
      fs.writeFileSync(truffleConfigPath, "this truffle.js file is different than the default box file", "utf8");
      assert(fs.existsSync(truffleConfigPath), "mock truffle.js wasn't created!");
      const mockConfig = fs.readFileSync(truffleConfigPath, "utf8");

      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true })
        .then(() => {
          assert(fs.existsSync(truffleConfigPath), "truffle.js wasn't recreated!");
          const newConfig = fs.readFileSync(truffleConfigPath, "utf8");
          assert(newConfig !== mockConfig, "truffle.js wasn't overwritten!");
          done();
        });
    });
  });

  describe("init/unbox prompt", () => {

    const contractDirPath = path.join(destination, "contracts");

    beforeEach(() => {
      // preconditions
      fs.ensureDirSync(contractDirPath);
      assert(fs.existsSync(contractDirPath), "contracts folder wasn't created!");
    });
    afterEach(() => {
      fs.removeSync(contractDirPath);
    });

    it("prompts when redundant files/folders exist in target directory", (done) => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
        .then(() => {
          assert.strictEqual(inquirer.prompt.called, true);
          assert.strictEqual(inquirer.prompt.callCount, 1);
          done();
        });
    });

    it('prompt questions call correctly', (done) => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
        .then(() => {
          assert(inquirer.prompt.getCall(0).args[0], "Prompt questions weren't called!");
          done();
        });
    });

    it('default response is false (do not overwrite)', (done) => {
      const expectedDefault = false;

      Box.unbox(TRUFFLE_BOX_DEFAULT, destination)
        .then(() => {
          assert.strictEqual(inquirer.prompt.getCall(0).args[0][0].default, expectedDefault);
          done();
        });
    });
  });
});
