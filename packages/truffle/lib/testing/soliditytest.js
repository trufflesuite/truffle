var TestCase = require("mocha/lib/test.js");
var Suite = require("mocha/lib/suite.js");
var Deployer = require("truffle-deployer");
var find_contracts = require("truffle-contract-sources");
var compile = require("truffle-compile");
var artifactor = require("truffle-artifactor");
var series = require("async").series;

var SolidityTest = {
  define: function(contract, dependency_paths, runner, mocha) {
    var self = this;

    var suite = new Suite(contract.contract_name);
    suite.timeout(runner.BEFORE_TIMEOUT);

    // Set up our runner's needs first.
    suite.beforeAll("prepare suite", function(done) {
      series([
        runner.initialize.bind(runner),
        self.compileNewAbstractInterface.bind(this, runner),
        self.deployTestDependencies.bind(this, contract, dependency_paths, runner)
      ], done);
    });

    suite.beforeEach("before test", function(done) {
      runner.startTest(this, done);
    });

    // Function that checks transaction logs to see if a test failed.
    function processResult(result) {
      result.logs.forEach(function(log) {
        if (log.event == "TestEvent" && log.args.result == false) {
          throw new Error(log.args.message);
        }
      })
    };

    // Add functions from test file.
    contract.abi.forEach(function(item) {
      if (item.type != "function") return;

      ["beforeAll", "beforeEach", "afterAll", "afterEach"].forEach(function(fn_type) {
        if (item.name.indexOf(fn_type) == 0) {
          suite[fn_type](item.name, function() {
            return contract.deployed().then(function(deployed) {
              return deployed[item.name]();
            }).then(processResult);
          });
        }
      });

      if (item.name.indexOf("test") == 0) {
        var test = new TestCase(item.name, function() {
          return contract.deployed().then(function(deployed) {
            return deployed[item.name]();
          }).then(processResult);
        });

        test.timeout(runner.TEST_TIMEOUT);
        suite.addTest(test);
      }
    });

    suite.afterEach("after test", function(done) {
      runner.endTest(this, done);
    });

    mocha.suite.addSuite(suite);
  },

  compileNewAbstractInterface: function(runner, callback) {
    var self = this;

    find_contracts(runner.config.contracts_directory, function(err, files) {
      if (err) return callback(err);

      compile.with_dependencies(runner.config.with({
        paths: [
          "truffle/DeployedAddresses.sol"
        ],
        quiet: true
      }), function(err, contracts) {
        if (err) return callback(err);

        // Set network values.
        Object.keys(contracts).forEach(function(name) {
          contracts[name].network_id = runner.config.network_id;
          contracts[name].default_network = runner.config.default_network;
        });

        runner.config.artifactor.saveAll(contracts, runner.config.contracts_build_directory).then(function() {
          callback();
        }).catch(callback);
      });
    });
  },

  deployTestDependencies: function(contract, dependency_paths, runner, callback) {
    var deployer = new Deployer(runner.config.with({
      logger: { log: function() {} }
    }));

    var Assert = runner.config.resolver.require("truffle/Assert.sol");
    var DeployedAddresses = runner.config.resolver.require("truffle/DeployedAddresses.sol");

    deployer.deploy([
      Assert,
      DeployedAddresses
    ]).then(function() {
      dependency_paths.forEach(function(dependency_path) {
        var dependency = runner.config.resolver.require(dependency_path);

        if (dependency.isDeployed()) {
          deployer.link(dependency, contract);
        }
      });
    });

    deployer.deploy(contract);

    deployer.start().then(function() {
      callback();
    }).catch(callback);
  }
};

module.exports = SolidityTest;
