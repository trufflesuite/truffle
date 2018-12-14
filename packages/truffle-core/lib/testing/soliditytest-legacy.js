var TestCase = require("mocha/lib/test.js");
var Suite = require("mocha/lib/suite.js");
var Deployer = require("truffle-migrate-legacy/node_modules/truffle-deployer");
var find_contracts = require("truffle-contract-sources");
var compile = require("truffle-migrate-legacy/node_modules/truffle-compile");
var series = require("async").series;
var path = require("path");
var SolidityCoder = require("truffle-migrate-legacy/node_modules/web3/lib/solidity/coder.js");
//const semver = require("semver"); <--- for use when BYOC enabled

let SafeSend;

var SolidityTest = {
  define: function(abstraction, dependency_paths, runner, mocha) {
    var self = this;

    var suite = new Suite(abstraction.contract_name, {});
    suite.timeout(runner.BEFORE_TIMEOUT);

    // Set up our runner's needs first.
    suite.beforeAll("prepare suite", function(done) {
      series(
        [
          runner.initialize.bind(runner),
          self.compileNewAbstractInterface.bind(this, runner),
          self.deployTestDependencies.bind(
            this,
            abstraction,
            dependency_paths,
            runner
          )
        ],
        done
      );
    });

    suite.beforeEach("before test", function(done) {
      runner.startTest(this, done);
    });

    // Function that decodes raw logs from unlinked third party assertion
    // libraries and returns usable TestEvent logs
    function decodeTestEvents(result) {
      if (result.logs.length) return result.logs;

      var logs = [];
      var signature = web3.sha3("TestEvent(bool,string)");

      result.receipt.logs.forEach(function(log) {
        if (log.topics.length === 2 && log.topics[0] === signature) {
          var decoded = {
            event: "TestEvent",
            args: {
              result: SolidityCoder.decodeParams(
                ["bool"],
                log.topics[1].replace("0x", "")
              )[0],
              message: SolidityCoder.decodeParams(
                ["string"],
                log.data.replace("0x", "")
              )[0]
            }
          };
          logs.push(decoded);
        }
      });
      return logs;
    }

    // Function that checks transaction logs to see if a test failed.
    function processResult(result) {
      result.logs = decodeTestEvents(result);

      result.logs.forEach(function(log) {
        if (log.event == "TestEvent" && log.args.result == false) {
          throw new Error(log.args.message);
        }
      });
    }

    // Add functions from test file.
    abstraction.abi.forEach(function(item) {
      if (item.type != "function") return;

      ["beforeAll", "beforeEach", "afterAll", "afterEach"].forEach(function(
        fn_type
      ) {
        if (item.name.indexOf(fn_type) == 0) {
          suite[fn_type](item.name, function() {
            return abstraction
              .deployed()
              .then(function(deployed) {
                return deployed[item.name]();
              })
              .then(processResult);
          });
        }
      });

      if (item.name.indexOf("test") == 0) {
        var test = new TestCase(item.name, function() {
          return abstraction
            .deployed()
            .then(function(deployed) {
              return deployed[item.name]();
            })
            .then(processResult);
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
    find_contracts(runner.config.contracts_directory, function(err) {
      if (err) return callback(err);

      // TODO (make legacy testing work w/ BYOC, compilerSupplier, solc ^0.5.0
      SafeSend = "OldSafeSend.sol";
      /*
        const config = runner.config;
        if (!config.compilers.solc.version) SafeSend = "NewSafeSend.sol";
        else if (semver.lt(semver.coerce(config.compilers.solc.version), "0.5.0"))
        SafeSend = "OldSafeSend.sol";
        else SafeSend = "NewSafeSend.sol";
      */

      compile.with_dependencies(
        runner.config.with({
          paths: [
            path.join(__dirname, "Assert.sol"),
            path.join(__dirname, "AssertAddress.sol"),
            path.join(__dirname, "AssertAddressArray.sol"),
            // path.join(__dirname, "AssertAddressPayableArray.sol"), only compatible w/ ^0.5.0
            path.join(__dirname, "AssertBalance.sol"),
            path.join(__dirname, "AssertBool.sol"),
            path.join(__dirname, "AssertBytes32.sol"),
            path.join(__dirname, "AssertBytes32Array.sol"),
            path.join(__dirname, "AssertGeneral.sol"),
            path.join(__dirname, "AssertInt.sol"),
            path.join(__dirname, "AssertIntArray.sol"),
            path.join(__dirname, "AssertString.sol"),
            path.join(__dirname, "AssertUint.sol"),
            path.join(__dirname, "AssertUintArray.sol"),
            "truffle/DeployedAddresses.sol", // generated by deployed.js
            path.join(__dirname, SafeSend)
          ],
          quiet: true
        }),
        function(err, contracts) {
          if (err) return callback(err);

          // Set network values.
          Object.keys(contracts).forEach(function(name) {
            contracts[name].network_id = runner.config.network_id;
            contracts[name].default_network = runner.config.default_network;
          });

          runner.config.artifactor
            .saveAll(contracts, runner.config.contracts_build_directory)
            .then(function() {
              callback();
            })
            .catch(callback);
        }
      );
    });
  },

  deployTestDependencies: function(
    abstraction,
    dependency_paths,
    runner,
    callback
  ) {
    var deployer = new Deployer(
      runner.config.with({
        logger: { log: function() {} }
      })
    );

    const assertLibraries = [
      "Assert",
      "AssertAddress",
      "AssertAddressArray",
      //      "AssertAddressPayableArray", only compatible w/ ^0.5.0
      "AssertBalance",
      "AssertBool",
      "AssertBytes32",
      "AssertBytes32Array",
      "AssertGeneral",
      "AssertInt",
      "AssertIntArray",
      "AssertString",
      "AssertUint",
      "AssertUintArray"
    ];

    const assertAbstractions = assertLibraries.map(name =>
      runner.config.resolver.require(`truffle/${name}.sol`)
    );

    const DeployedAddresses = runner.config.resolver.require(
      "truffle/DeployedAddresses.sol"
    );
    SafeSend = runner.config.resolver.require(SafeSend);

    for (const abstraction of assertAbstractions) {
      deployer.deploy(abstraction);
    }
    deployer.deploy(DeployedAddresses).then(() => {
      return dependency_paths.forEach(dependency_path => {
        const dependency = runner.config.resolver.require(dependency_path);

        if (dependency.isDeployed()) deployer.link(dependency, abstraction);
      });
    });

    let deployed;
    deployer
      .deploy(abstraction)
      .then(function() {
        return abstraction.deployed();
      })
      .then(function(instance) {
        deployed = instance;
        if (deployed.initialBalance) {
          return deployed.initialBalance.call();
        } else {
          return 0;
        }
      })
      .then(function(balance) {
        if (balance != 0) {
          return deployer
            .deploy(SafeSend, deployed.address, {
              value: balance
            })
            .then(function() {
              return SafeSend.deployed();
            })
            .then(function(safesend) {
              return safesend.deliver();
            });
        }
      });

    deployer
      .start()
      .then(function() {
        callback();
      })
      .catch(callback);
  }
};

module.exports = SolidityTest;
