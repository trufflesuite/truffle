const { default: Box } = require("@truffle/box");
const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const fs = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Ganache = require("ganache");
const Reporter = require("../reporter");

describe("Cyclic Dependencies [ @standalone ]", function () {
  let config;
  let options;
  const logger = new MemoryLogger();

  before("set up sandbox", async () => {
    options = { name: "default", force: true };
    config = await Box.sandbox(options);
    config.logger = logger;
    config.networks.development.provider = Ganache.provider({
      miner: {
        instamine: "strict"
      },
      gasLimit: config.gas
    });
    config.mocha = {
      reporter: new Reporter(logger)
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

  it("will compile cyclic dependencies that Solidity is fine with (no `new`'s)", async function () {
    this.timeout(20000);

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
