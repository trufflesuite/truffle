var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var contract = require("@truffle/contract");
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var sandbox = require("../sandbox");
var Server = require("../server");
var Reporter = require("../reporter");

describe("`truffle compile` as external", function() {
  // These tests rely on a solc jq dependency installed with apt-get
  // You can run them locally with `CI=true npm test`
  if (!process.env.CI) return;

  var config;
  var project = path.join(__dirname, "../../sources/external_compile");
  var logger = new MemoryLogger();

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  before("set up sandbox", function() {
    this.timeout(10000);
    return sandbox.create(project).then(conf => {
      config = conf;
      config.network = "development";
      config.logger = logger;
      config.mocha = {
        reporter: new Reporter(logger)
      };
    });
  });

  it("will compile", async function() {
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

  it("will migrate", async function() {
    this.timeout(50000);

    await CommandRunner.run("migrate", config);
    var MetaCoin = contract(
      require(path.join(config.contracts_build_directory, "MetaCoin.json"))
    );
    var ConvertLib = contract(
      require(path.join(config.contracts_build_directory, "ConvertLib.json"))
    );
    var Migrations = contract(
      require(path.join(config.contracts_build_directory, "Migrations.json"))
    );
    var ExtraMetaCoin = contract(
      require(path.join(config.contracts_build_directory, "ExtraMetaCoin.json"))
    );

    var promises = [];

    [MetaCoin, ConvertLib, Migrations, ExtraMetaCoin].forEach(function(
      abstraction
    ) {
      abstraction.setProvider(config.provider);

      promises.push(
        abstraction.deployed().then(function(instance) {
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

  it("will run tests", async function() {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.indexOf("3 passing") >= 0);
  });
});
