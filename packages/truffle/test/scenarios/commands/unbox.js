const assert = require("assert");
const CommandRunner = require("../commandRunner");
const MemoryLogger = require("../MemoryLogger");
const fse = require("fs-extra");
const tmp = require("tmp");
const path = require("path");
const Config = require("@truffle/config");

describe("truffle unbox [ @standalone ]", () => {
  let config, tempDir;
  const logger = new MemoryLogger();
  const DEBUG_ENV_STRING = "*";

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    config = { working_directory: tempDir.name };
    config.logger = logger;
    config = Config.default().merge(config);
  });

  describe("when run without arguments", () => {
    it("unboxes truffle-init-default", async () => {
      await CommandRunner.run("unbox --force", config, DEBUG_ENV_STRING);
      assert(
        fse.pathExistsSync(
          path.join(tempDir.name, "contracts", "ConvertLib.sol")
        ),
        "ConvertLib.sol does not exist"
      );
      assert(
        fse.pathExistsSync(
          path.join(tempDir.name, "contracts", "Migrations.sol")
        ),
        "Migrations.sol does not exist"
      );
      assert(
        fse.pathExistsSync(
          path.join(tempDir.name, "contracts", "MetaCoin.sol")
        ),
        "MetaCoin.sol does not exist"
      );
    }).timeout(20000);
  });

  describe("when run with arguments", () => {
    describe("valid input", () => {
      describe("full url", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run(
            "unbox https://github.com/truffle-box/bare-box",
            config,
            DEBUG_ENV_STRING
          );
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("full url + branch", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run(
            "unbox https://github.com/truffle-box/bare-box#truffle-test-branch",
            config,
            DEBUG_ENV_STRING
          );
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("origin/master", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run(
            "unbox truffle-box/bare-box",
            config,
            DEBUG_ENV_STRING
          );
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("origin/master#branch", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run(
            "unbox truffle-box/bare-box#truffle-test-branch",
            config,
            DEBUG_ENV_STRING
          );
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("official truffle box", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run("unbox bare", config, DEBUG_ENV_STRING);
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("official truffle-box", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run("unbox bare-box", config, DEBUG_ENV_STRING);
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("official truffle box + branch", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run(
            "unbox bare#truffle-test-branch",
            config,
            DEBUG_ENV_STRING
          );
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("git@ ssh", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run(
            "unbox git@github.com:truffle-box/bare-box",
            config,
            DEBUG_ENV_STRING
          );
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("with an invalid git@ ssh", () => {
        it("logs an error", async () => {
          try {
            await CommandRunner.run(
              "unbox git@github.com:truffle-box/bare-boxer",
              config,
              DEBUG_ENV_STRING
            );
          } catch (_error) {
            const output = logger.contents();
            assert(output.includes("doesn't exist."));
          }
        }).timeout(20000);
      });

      describe("git@ ssh + branch", () => {
        it("unboxes successfully", async () => {
          await CommandRunner.run(
            "unbox git@github.com:truffle-box/bare-box#truffle-test-branch",
            config,
            DEBUG_ENV_STRING
          );
          assert(fse.existsSync(path.join(tempDir.name, "truffle-config.js")));
        }).timeout(20000);
      });

      describe("when run with a path", () => {
        it("unboxes successfully to the specified path", async () => {
          const myPath = "./candy/cane/lane";
          await CommandRunner.run(
            `unbox truffle-box/bare-box ${myPath}`,
            config,
            DEBUG_ENV_STRING
          );
          assert(
            fse.pathExistsSync(
              path.join(tempDir.name, myPath, "truffle-config.js")
            )
          );
        }).timeout(20000);
      });
    });

    describe("with invalid input", () => {
      describe("invalid full url", () => {
        it("throws an error", async () => {
          try {
            await CommandRunner.run(
              "unbox https://github.com/truffle-box/bare-boxing",
              config,
              DEBUG_ENV_STRING
            );
            assert(false, "This should have thrown an error.");
          } catch (_error) {
            const output = logger.contents();
            assert(output.includes("doesn't exist."));
          }
        }).timeout(20000);
      });

      describe("invalid origin/master", () => {
        it("throws an error", async () => {
          try {
            await CommandRunner.run(
              "unbox truffle-box/bare-boxer",
              config,
              DEBUG_ENV_STRING
            );
            assert(false, "This should have thrown an error.");
          } catch (_error) {
            const output = logger.contents();
            assert(output.includes("doesn't exist."));
          }
        }).timeout(20000);
      });

      describe("invalid official truffle box", () => {
        it("throws an error", async () => {
          try {
            await CommandRunner.run("unbox barer", config, DEBUG_ENV_STRING);
            assert(false, "This should have thrown an error.");
          } catch (_error) {
            const output = logger.contents();
            assert(output.includes("doesn't exist."));
          }
        }).timeout(20000);
      });

      describe("invalid git@ ssh", () => {
        it("throws an error", async () => {
          try {
            await CommandRunner.run(
              "unbox git@github.com:truffle-box/bare-boxer",
              config,
              DEBUG_ENV_STRING
            );
            assert(false, "This should have thrown an error");
          } catch (error) {
            const output = logger.contents();
            assert(output.includes("doesn't exist."));
          }
        }).timeout(20000);
      });

      describe("invalid box format", () => {
        it("throws an error", async () => {
          try {
            await CommandRunner.run("unbox bare//", config, DEBUG_ENV_STRING);
            assert(false, "This should have thrown an error.");
          } catch (_error) {
            const output = logger.contents();
            assert(output.includes("invalid format"));
          }
        }).timeout(20000);
      });
    });
  });
});
