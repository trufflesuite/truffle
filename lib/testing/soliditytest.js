var TestCase = require("mocha/lib/test.js");
var Suite = require("mocha/lib/suite.js");
var Deployer = require("truffle-deployer");
var find_contracts = require("truffle-contract-sources");
var compile = require("truffle-compile");
var artifactor = require("truffle-artifactor");
var contract = require("truffle-contract");
var series = require("async").series;
var path = require("path");

var SolidityTest = {
  define: function(abstraction, dependency_paths, runner, mocha) {
    var self = this;

    var suite = new Suite(abstraction.contract_name, {});
    suite.timeout(runner.BEFORE_TIMEOUT);

    // Set up our runner's needs first.
    suite.beforeAll("prepare suite", function(done) {
      series([
        runner.initialize.bind(runner),
        self.compileNewAbstractInterface.bind(this, runner),
        self.deployTestDependencies.bind(this, abstraction, dependency_paths, runner)
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

    // // Find initialBalance, if it exists, and queue up that transaction.
    // for (var i = 0; i < abstraction.abi.length; i++) {
    //   var item = abstraction.abi[i];
    //
    //   if (item.type != "function" || item.name != "initialBalance") {
    //     continue;
    //   }
    //
    //   suite.beforeAll("send initial balance to test contract", function(done) {
    //     var deployed;
    //     var Sender;
    //     Promise.resolve().then(function() {
    //       return new Promise(function(accept, reject) {
    //         compile.with_dependencies(runner.config.with({
    //           paths: [
    //             path.join(__dirname, "Sender.sol")
    //           ],
    //           quiet: false
    //         }), function(err, contracts) {
    //           if (err) return reject(err);
    //           Sender = contract(contracts["Sender"]);
    //           Sender.network_id = runner.config.network_id;
    //           Sender.setProvider(runner.web3.currentProvider);
    //           accept();
    //         });
    //       });
    //     }).then(function() {
    //       return abstraction.deployed()
    //     }).then(function(instance) {
    //       deployed = instance;
    //       return deployed.initialBalance.call();
    //     }).then(function(balance) {
    //       //return deployed.send(balance);
    //       console.log(deployed.address);
    //       return Sender.new(deployed.address, {
    //         value: balance
    //       });
    //     });
    //   });
    //
    //   // We found what we needed, no need to continue.
    //   break;
    // }

    // Add functions from test file.
    abstraction.abi.forEach(function(item) {
      if (item.type != "function") return;

      ["beforeAll", "beforeEach", "afterAll", "afterEach"].forEach(function(fn_type) {
        if (item.name.indexOf(fn_type) == 0) {
          suite[fn_type](item.name, function() {
            return abstraction.deployed().then(function(deployed) {
              return deployed[item.name]();
            }).then(processResult);
          });
        }
      });

      if (item.name.indexOf("test") == 0) {
        var test = new TestCase(item.name, function() {
          return abstraction.deployed().then(function(deployed) {
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
          "truffle/DeployedAddresses.sol",
          path.join(__dirname, "Sender.sol")
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

  deployTestDependencies: function(abstraction, dependency_paths, runner, callback) {
    var deployer = new Deployer(runner.config.with({
      logger: { log: function() {} }
    }));

    var Assert = runner.config.resolver.require("truffle/Assert.sol");
    var DeployedAddresses = runner.config.resolver.require("truffle/DeployedAddresses.sol");
    var Sender = runner.config.resolver.require("Sender.sol");

    deployer.deploy([
      Assert,
      DeployedAddresses
    ]).then(function() {
      dependency_paths.forEach(function(dependency_path) {
        var dependency = runner.config.resolver.require(dependency_path);

        if (dependency.isDeployed()) {
          deployer.link(dependency, abstraction);
        }
      });
    });

    var deployed;
    deployer.deploy(abstraction).then(function() {
      return abstraction.deployed();
    }).then(function(instance) {
      deployed = instance;
      if (deployed.initialBalance) {
        return deployed.initialBalance.call();
      } else {
        return 0;
      }
    }).then(function(balance) {
      if (balance != 0) {
        console.log("NON ZERO BALANCE", balance)
        return deployer.deploy(Sender, deployed.address, {
          value: balance
        });
      }
    });

    deployer.start().then(function() {
      callback();
    }).catch(callback);
  }
};

module.exports = SolidityTest;
