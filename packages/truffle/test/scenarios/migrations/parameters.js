var Box = require("truffle-box");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var contract = require("truffle-contract");
var fs = require("fs-extra");
var path = require("path");
var assert = require("assert");
var Reporter = require("../reporter");
var Server = require("../server");
var Web3 = require("web3");

describe("Migration Parameters", function() {
  var config;
  var logger = new MemoryLogger();
  var accounts;

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  before("set up sandbox", function(done) {
    this.timeout(10000);
    Box.sandbox("default", function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.logger = logger;
      config.network = "development";
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
    var web3 = new Web3(config.provider);
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  it("will migrate and save the correct output data", function(done) {
    this.timeout(50000);

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
