var Init = require("truffle-init");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var contract = require("truffle-contract");
var fs = require("fs-extra");
var path = require("path");
var assert = require("assert");
var TestRPC = require("ethereumjs-testrpc");
var Reporter = require("../reporter");
var Web3 = require("web3");

describe("Migration Parameters", function() {
  var config;
  var logger = new MemoryLogger();
  var accounts;

  before("set up sandbox", function(done) {
    this.timeout(10000);
    Init.sandbox("default", function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.logger = logger;
      config.networks.development.provider = TestRPC.provider();
      config.mocha = {
        reporter: new Reporter(logger)
      }
      done();
    });
  });

  before("copy template migration", function() {
    fs.copySync(path.join(__dirname, "2_deploy_contract.js.template"), path.join(config.migrations_directory, "2_deploy_contract.js"));
  });

  before("get accounts", function(done) {
    var web3 = new Web3(config.networks.development.provider);
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  it("will migrate and out save the correct output data", function(done) {
    this.timeout(20000);

    var expected_file = path.join(config.migrations_directory, "output.json");

    CommandRunner.run("migrate", config, function(err) {
      if (err) return done(err);

      var data = fs.readFileSync(expected_file, "utf8");
      data = JSON.parse(data);

      assert.equal(data.network, "development");
      assert.deepEqual(data.accounts, accounts);

      done();
    });
  });
});
