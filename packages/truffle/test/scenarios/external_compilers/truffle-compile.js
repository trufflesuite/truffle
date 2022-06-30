const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const contract = require("@truffle/contract");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const sandbox = require("../sandbox");
const Server = require("../server");

describe("`truffle compile` as external", function () {
  // These tests rely on a solc jq dependency installed with apt-get
  // You can run them locally with `CI=true npm test`
  if (!process.env.CI) return;

  let config;
  const project = path.join(__dirname, "../../sources/external_compile");
  const logger = new MemoryLogger();

  before(async function () {
    this.timeout(10000);
    await Server.start();
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
  });
  after(async function () {
    await Server.stop();
  });

  it("compiles", async function () {
    this.timeout(20000);

    await CommandRunner.run("compile --compiler=external", config);
    assert(
      fs.existsSync(
        path.join(config.contracts_build_directory, "MetaCoin.json")
      )
    );
    assert(
      fs.existsSync(
        path.join(config.contracts_build_directory, "ConvertLib.json")
      )
    );
    assert(
      fs.existsSync(
        path.join(config.contracts_build_directory, "Migrations.json")
      )
    );
    assert(
      fs.existsSync(
        path.join(config.contracts_build_directory, "ExtraMetaCoin.json")
      )
    );
  });

  it("migrates", async function () {
    this.timeout(50000);

    await CommandRunner.run("migrate", config);
    const MetaCoin = contract(
      require(path.join(config.contracts_build_directory, "MetaCoin.json"))
    );
    const ConvertLib = contract(
      require(path.join(config.contracts_build_directory, "ConvertLib.json"))
    );
    const Migrations = contract(
      require(path.join(config.contracts_build_directory, "Migrations.json"))
    );
    const ExtraMetaCoin = contract(
      require(path.join(config.contracts_build_directory, "ExtraMetaCoin.json"))
    );

    const promises = [];

    [MetaCoin, ConvertLib, Migrations, ExtraMetaCoin].forEach(function (
      abstraction
    ) {
      abstraction.setProvider(config.provider);

      promises.push(
        abstraction.deployed().then(function (instance) {
          assert.notEqual(
            instance.address,
            null,
            instance.contract_name + " didn't have an address!"
          );
        })
      );
    });

    await Promise.all(promises);
  });

  it("runs tests", async function () {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.indexOf("3 passing") >= 0);
  });
});
