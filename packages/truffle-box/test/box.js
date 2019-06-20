const path = require("path");
const fse = require("fs-extra");
const assert = require("assert");
const inquirer = require("inquirer");
const sinon = require("sinon");
const Box = require("../");
const TRUFFLE_BOX_DEFAULT =
  "git@github.com:trufflesuite/truffle-init-default.git";
const utils = require("../lib/utils");
let options, cleanupCallback;

describe("truffle-box Box", () => {
  const destination = path.join(__dirname, ".truffle_test_tmp");

  beforeEach(() => {
    fse.ensureDirSync(destination);
  });
  afterEach(() => {
    fse.removeSync(destination);
  });

  describe(".unbox()", () => {
    beforeEach(() => {
      sinon.stub(Box, "checkDir").returns(Promise.resolve());
      fse.emptyDirSync(destination);
    });
    afterEach(() => {
      Box.checkDir.restore();
    });

    it("unboxes truffle box from github", done => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination).then(truffleConfig => {
        assert.ok(truffleConfig);

        assert(
          fse.existsSync(path.join(destination, "truffle-config.js")),
          "Unboxed project should have truffle config."
        );
        done();
      });
    });

    it("does not copy the config files or ignored files in the config", () => {
      // Assert the file is not there first.
      assert(
        fse.existsSync(path.join(destination, "truffle-init.json")) === false,
        "truffle-init.json shouldn't be available to the user!"
      );

      // Now assert the README.md and the .gitignore file were removed.
      assert(
        fse.existsSync(path.join(destination, "README.md")) === false,
        "README.md didn't get removed!"
      );
      assert(
        fse.existsSync(path.join(destination, ".gitignore")) === false,
        ".gitignore didn't get removed!"
      );
    });

    describe("when an error is thrown in the try block", () => {
      beforeEach(() => {
        cleanupCallback = sinon.spy();
        sinon.stub(utils, "downloadBox").throws();
        sinon.stub(utils, "setUpTempDirectory").returns(
          new Promise(resolve => {
            resolve({
              path: destination,
              cleanupCallback
            });
          })
        );
      });
      afterEach(() => {
        utils.setUpTempDirectory.restore();
        utils.downloadBox.restore();
      });

      it("calls the cleanup function if it is available", function(done) {
        Box.unbox(TRUFFLE_BOX_DEFAULT, destination).catch(() => {
          assert(cleanupCallback.called);
          done();
        });
      });
    });
  });

  describe("--force", () => {
    beforeEach(() => {
      sinon.stub(inquirer, "prompt").returns(Promise.resolve(true));
    });
    afterEach(() => {
      inquirer.prompt.restore();
    });

    it("unboxes truffle box when used", done => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true }).then(
        truffleConfig => {
          assert.ok(truffleConfig);

          assert(
            fse.existsSync(path.join(destination, "truffle-config.js")),
            "Unboxed project should have truffle config."
          );
          done();
        }
      );
    });

    it("runs without a prompt", done => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true }).then(() => {
        assert.strictEqual(inquirer.prompt.called, false);
        done();
      });
    });

    it("overwrites redundant files if init/unbox force flag used", done => {
      const truffleConfigPath = path.join(destination, "truffle-config.js");

      // preconditions
      fse.writeFileSync(
        truffleConfigPath,
        "this truffle-config.js file is different than the default box file",
        "utf8"
      );
      assert(
        fse.existsSync(truffleConfigPath),
        "mock truffle-config.js wasn't created!"
      );
      const mockConfig = fse.readFileSync(truffleConfigPath, "utf8");

      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, { force: true }).then(() => {
        assert(
          fse.existsSync(truffleConfigPath),
          "truffle-config.js wasn't recreated!"
        );
        const newConfig = fse.readFileSync(truffleConfigPath, "utf8");
        assert(
          newConfig !== mockConfig,
          "truffle-config.js wasn't overwritten!"
        );
        done();
      });
    });
  });

  describe("init/unbox prompt", () => {
    const contractDirPath = path.join(destination, "contracts");

    beforeEach(() => {
      options = { logger: { log: () => {} } };
      // preconditions
      sinon
        .stub(inquirer, "prompt")
        .returns(Promise.resolve({ proceed: true, overwrite: true }));
      fse.ensureDirSync(contractDirPath);
      assert(
        fse.existsSync(contractDirPath),
        "contracts folder wasn't created!"
      );
    });
    afterEach(() => {
      inquirer.prompt.restore();
      fse.removeSync(contractDirPath);
    });

    it("prompts when redundant files/folders exist in target directory", done => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, options).then(() => {
        assert.strictEqual(inquirer.prompt.called, true);
        assert.strictEqual(inquirer.prompt.callCount, 2);
        done();
      });
    });

    it("prompt questions call correctly", done => {
      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, options).then(() => {
        assert(
          inquirer.prompt.getCall(0).args[0],
          "Prompt questions weren't called!"
        );
        done();
      });
    });

    it("overwrites redundant files when prompted and user confirms", done => {
      const truffleConfigPath = path.join(destination, "truffle-config.js");

      // preconditions
      fse.writeFileSync(
        truffleConfigPath,
        "this truffle-config.js file is different than the default box file",
        "utf8"
      );
      assert(
        fse.existsSync(truffleConfigPath),
        "mock truffle-config.js wasn't created!"
      );
      const mockConfig = fse.readFileSync(truffleConfigPath, "utf8");

      Box.unbox(TRUFFLE_BOX_DEFAULT, destination, options).then(() => {
        assert(inquirer.prompt.called);
        assert(
          fse.existsSync(truffleConfigPath),
          "truffle-config.js wasn't recreated!"
        );
        const newConfig = fse.readFileSync(truffleConfigPath, "utf8");
        assert(
          newConfig !== mockConfig,
          "truffle-config.js wasn't overwritten!"
        );
        done();
      });
    });
  });

  describe("Box.checkDir()", () => {
    let options = {
      logger: {
        log(stringToLog) {
          this.loggedStuff = this.loggedStuff + stringToLog;
        },
        loggedStuff: ""
      }
    };

    beforeEach(() => {
      sinon
        .stub(inquirer, "prompt")
        .returns(Promise.resolve({ proceed: true }));
    });
    afterEach(() => {
      inquirer.prompt.restore();
    });

    describe("when directory is empty", () => {
      before(() => {
        sinon.stub(fse, "readdirSync").returns([]);
      });
      after(() => {
        fse.readdirSync.restore();
      });

      it("doesn't prompt user", async () => {
        await Box.checkDir();
        assert.strictEqual(inquirer.prompt.called, false);
      });
    });

    describe("when directory is non-empty", () => {
      before(() => {
        sinon.stub(fse, "readdirSync").returns(["someCrappyFile.js"]);
      });
      after(() => {
        fse.readdirSync.restore();
      });

      it("prompts user", () => {
        Box.checkDir(options);
        assert(inquirer.prompt.called);
      });
    });

    describe("when directory is non-empty and user declines to unbox", () => {
      before(() => {
        sinon.stub(fse, "readdirSync").returns(["someCrappyFile.js"]);
        sinon.stub(process, "exit").returns(1);
      });
      after(() => {
        fse.readdirSync.restore();
        process.exit.restore();
      });

      it("Exits unbox process", async () => {
        inquirer.prompt.restore();
        sinon
          .stub(inquirer, "prompt")
          .returns(Promise.resolve({ proceed: false }));
        await Box.checkDir(options);
        assert(inquirer.prompt.called);
        assert(options.logger.loggedStuff.includes("Unbox cancelled"));
        assert(process.exit.called);
        assert.deepStrictEqual(fse.readdirSync(), ["someCrappyFile.js"]);
      });
    });
  });
});
