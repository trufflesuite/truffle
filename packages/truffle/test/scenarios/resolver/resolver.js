const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");

describe("Solidity Imports [ @standalone ]", function () {
  let config;
  const project = path.join(__dirname, "../../sources/monorepo");
  const logger = new MemoryLogger();

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  /**
   * Directory Structure
   * -------------------
   *
   * + node_modules/
   * |-- nodepkg/
   * |   |-- ImportOfImport.sol # Local import for NodeImport.sol
   * |   |-- NodeImport.sol
   * |
   * + installed_contracts/
   * |-- ethpmpkg/
   * |   |-- EthPMImport.sol
   * |
   * + truffleproject/
   * |-- contracts/
   * |   |-- Importer.sol # This imports everthing
   * |-- node_modules/
   * |   |-- nodepkg/
   * |      |-- LocalNodeImport.sol
   * |-- truffle-config.js
   * |
   * + errorproject/
   * |-- contracts/
   * |   |-- Importer.sol # Imports a non-existent file
   * |
   */

  describe("success", function () {
    before(async function () {
      this.timeout(10000);
      config = await sandbox.create(project, "truffleproject");
      config.network = "development";
      config.logger = logger;
    });

    it("resolves solidity imports located outside the working directory", async function () {
      this.timeout(30000);

      await CommandRunner.run("compile", config);
      const output = logger.contents();

      assert(output.includes("./contracts/Importer.sol"));
      assert(output.includes("ethpmpkg/EthPMImport.sol"));
      assert(output.includes("nodepkg/ImportOfImport.sol"));
      assert(output.includes("nodepkg/LocalNodeImport.sol"));
      assert(output.includes("nodepkg/NodeImport.sol"));
    });
  });

  describe("failure", function () {
    before(async function () {
      this.timeout(10000);
      config = await sandbox.create(project, "errorproject");
      config.network = "development";
      config.logger = logger;
    });

    it("exposes compile error if an import is not found", async function () {
      this.timeout(30000);

      try {
        await CommandRunner.run("compile", config);
      } catch (_) {
        const output = logger.contents();
        assert(output.includes("Error"));
        assert(output.includes('Source "nodepkg/DoesNotExist.sol" not found'));
        assert(output.includes("Importer.sol"));
      }
    });
  });
});
