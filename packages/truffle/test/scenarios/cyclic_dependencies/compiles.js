const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const fs = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Ganache = require("ganache");
const sandbox = require("../sandbox");

describe("Cyclic Dependencies [ @standalone ]", function () {
  let config, cleanupSandboxDir;
  const logger = new MemoryLogger();

  before("set up sandbox", async () => {
    ({ config, cleanupSandboxDir } = await sandbox.create(
      path.join(__dirname, "../../sources/init")
    ));
    config.logger = logger;
    config.networks = {
      development: {
        provider: Ganache.provider({
          miner: {
            instamine: "strict"
          },
          gasLimit: config.gas
        })
      }
    };
  });

  before("add files with cyclic dependencies", function () {
    fs.copySync(
      path.join(__dirname, "Ping.sol"),
      path.join(config.contracts_directory, "Ping.sol")
    );
    fs.copySync(
      path.join(__dirname, "Pong.sol"),
      path.join(config.contracts_directory, "Pong.sol")
    );
  });

  after(function () {
    cleanupSandboxDir();
  });

  it("compiles cyclic dependencies that Solidity is fine with (no `new`'s)", async function () {
    this.timeout(25000);

    await CommandRunner.run("compile", config);

    // If it gets this far, it worked. The compiler shouldn't throw an error.
    // Lets check artifacts are there though.

    assert(
      fs.existsSync(path.join(config.contracts_build_directory, "Ping.json"))
    );
    assert(
      fs.existsSync(path.join(config.contracts_build_directory, "Pong.json"))
    );
  });
}).timeout(10000);
