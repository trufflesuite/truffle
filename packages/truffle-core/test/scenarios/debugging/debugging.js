var Init = require("truffle-init");
var Debugger = require("truffle-debugger");
var TestRPC = require("ganache-core");
var Web3 = require("web3");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var Reporter = require("../reporter");
var fs = require("fs-extra");
var path = require("path");

describe("debugger", function() {
  var tx_to_debug;
  var logger = new MemoryLogger();
  var Contract;
  var port = 12345;
  var server;
  var provider;

  before("set up Ganache server", function(done) {
    var logger = {
      log: function(message) {
        //console.log(message);
      }
    };

    server = TestRPC.server({
      logger: logger
    });

    server.listen(port, function(err) {
      provider = new Web3.providers.HttpProvider("http://localhost:" + port);
      done();
    });
  });

  after("Shutdown server", function(done) {
    server.close(done);
  });

  before("Create a sandbox", function(done) {
    this.timeout(10000);
    Init.sandbox("bare", function(err, result) {
      if (err) return done(err);
      config = result;
      config.logger = logger;
      // config.resolver = new Resolver(config);
      // config.artifactor = new Artifactor(config.contracts_build_directory);
      config.network = "development";
      config.networks.development.provider = provider;
      config.mocha = {
        reporter: new Reporter(logger)
      };
      done();
    });
  });

  before("add contract and migration", function() {
    fs.copySync(path.join(__dirname, "contract.sol"), path.join(config.contracts_directory, "contract.sol"));
    fs.copySync(path.join(__dirname, "2_deploy_contract.js.template"), path.join(config.migrations_directory, "2_deploy_contract.js"));
  });

  before("migrate (will also compile)", function(done) {
    this.timeout(20000);

    CommandRunner.run("migrate", config, done);
  });

  before("set up transaction", function(done) {
    Contract = config.resolver.require("Contract");

    Contract.deployed().then(function(instance) {
      return instance.setValue(27);
    }).then(function(result) {
      tx_to_debug = result.tx;
      done();
    }).catch(done);
  });

  it("debugs a transaction", function(done) {
    var bugger = new Debugger(config);
    bugger.start(tx_to_debug, function(err, bugger) {

      // What tests should we write for this?

      done(err);
    });
  });

});
