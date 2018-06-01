var Mocha = require("mocha");
var chai = require("chai");
var path = require("path");
var Web3 = require("web3");
var Config = require("truffle-config");
var Contracts = require("truffle-workflow-compile");
var Resolver = require("truffle-resolver");
var TestRunner = require('./testing/testrunner');
var TestResolver = require("./testing/testresolver");
var TestSource = require("./testing/testsource");
var SolidityTest = require("./testing/soliditytest");
var expect = require("truffle-expect");
var Migrate = require("truffle-migrate");
var Profiler = require("truffle-compile/profiler.js");
var originalrequire = require("original-require");

chai.use(require("./assertions"));

var Test = {
  run: function(migrationConfigs, callback) {
    var self = this;

    migrationConfigs = migrationConfigs.map(function(config) {
      expect.options(config, [
        "contracts_directory",
        "contracts_build_directory",
        "migrations_directory",
        "network",
        "network_id",
      ]);

      return Config.default().merge(config);
    });

    var rootConfig = migrationConfigs[migrationConfigs.length - 1];
    var otherConfigs = migrationConfigs.slice(0, -1);

    expect.options(rootConfig, [
      "test_files",
      "provider",
    ]);

    rootConfig.test_files = rootConfig.test_files.map(function(test_file) {
      return path.resolve(test_file);
    });

    // `accounts` will be populated before each contract() invocation
    // and passed to it so tests don't have to call it themselves.
    var web3 = new Web3();
    web3.setProvider(rootConfig.provider);

    // Override console.warn() because web3 outputs gross errors to it.
    // e.g., https://github.com/ethereum/web3.js/blob/master/lib/web3/allevents.js#L61
    // Output looks like this during tests: https://gist.github.com/tcoulter/1988349d1ec65ce6b958
    var warn = rootConfig.logger.warn;
    rootConfig.logger.warn = function(message) {
      if (message == "cannot find event for log") {
        return;
      } else {
        if (warn) {
          warn.apply(console, arguments);
        }
      }
    };

    var mocha = this.createMocha(rootConfig);

    var js_tests = rootConfig.test_files.filter(function(file) {
      return path.extname(file) != ".sol";
    });

    var sol_tests = rootConfig.test_files.filter(function(file) {
      return path.extname(file) == ".sol";
    });

    // Add Javascript tests because there's nothing we need to do with them.
    // Solidity tests will be handled later.
    js_tests.forEach(function(file) {
      // There's an idiosyncracy in Mocha where the same file can't be run twice
      // unless we delete the `require` cache.
      // https://github.com/mochajs/mocha/issues/995
      delete originalrequire.cache[file];

      mocha.addFile(file);
    });

    var dependency_paths = [];
    var testContracts = [];
    var accounts = [];
    var runner;
    var test_resolver;

    web3.eth.getAccounts().then(function(accs) {
      accounts = accs;

      if (!rootConfig.from) {
        rootConfig.from = accounts[0];
      }

      if (!rootConfig.resolver) {
        rootConfig.resolver = new Resolver(rootConfig);
      }

      var test_source = new TestSource(rootConfig);

      test_resolver = new TestResolver(rootConfig.resolver, test_source, rootConfig.contracts_build_directory);
      test_resolver.cache_on = false;

      return self.compileContractsWithTestFilesIfNeeded(sol_tests, rootConfig, otherConfigs, test_resolver);
    }).then(function(paths) {
      dependency_paths = paths;

      testContracts = sol_tests.map(function(test_file_path) {
        var built_name = "./" + path.basename(test_file_path);
        return test_resolver.require(built_name);
      });

      runner = new TestRunner(rootConfig);

      return self.performInitialDeploy(migrationConfigs, test_resolver);
    }).then(function() {
      return self.defineSolidityTests(mocha, testContracts, dependency_paths, runner);
    }).then(function() {
      return self.setJSTestGlobals(web3, accounts, test_resolver, runner);
    }).then(function() {
      // Finally, run mocha.
      process.on('unhandledRejection', function(reason, p) {
        throw reason;
      });

      mocha.run(function(failures) {
        rootConfig.logger.warn = warn;

        callback(failures);
      });
    }).catch(callback);
  },

  createMocha: function(config) {
    // Allow people to specify config.mocha in their config.
    var mochaConfig = config.mocha || {};

    // If the command line overrides color usage, use that.
    if (config.colors != null) {
      mochaConfig.useColors = config.colors;
    }

    // Default to true if configuration isn't set anywhere.
    if (mochaConfig.useColors == null) {
      mochaConfig.useColors = true;
    }

    var mocha = new Mocha(mochaConfig);

    return mocha;
  },

  getAccounts: function(web3, config) {
    return new Promise(function(accept, reject) {
      web3.eth.getAccounts(function(err, accs) {
        if (err) return reject(err);
        accept(accs);
      });
    });
  },

  compileContractsWithTestFilesIfNeeded: function(solidity_test_files, rootConfig, otherConfigs, test_resolver) {
    return new Promise(function(accept, reject) {
      async.eachSeries(otherConfigs, function(config, callback) {
        Contracts.compile(config, callback);
      }, function(err) {
        if (err) return reject(err);

        Profiler.updated(rootConfig.with({
          resolver: test_resolver
        }), function(err, updated) {
          if (err) return reject(err);

          updated = updated || [];

          // Compile project contracts and test contracts
          Contracts.compile(rootConfig.with({
            all: rootConfig.compileAll === true,
            files: updated.concat(solidity_test_files),
            resolver: test_resolver,
            quiet: false,
            quietWrite: true
          }), function(err, abstractions, paths) {
            if (err) return reject(err);
            accept(paths);
          });
        });
      });
    });
  },

  performInitialDeploy: function(migrationConfigs, resolver) {
    return new Promise(function(accept, reject) {
      async.eachSeries(migrationConfigs, function(config, callback) {
        Migrate.run(config.with({
          reset: true,
          resolver: resolver,
          quiet: true
        }), callback);
      }, function(err) {
        if (err) return reject(err);
        accept();
      });
    });
  },

  defineSolidityTests: function(mocha, contracts, dependency_paths, runner) {
    return new Promise(function(accept) {
      contracts.forEach(function(contract) {
        SolidityTest.define(contract, dependency_paths, runner, mocha);
      });

      accept();
    });
  },

  setJSTestGlobals: function(web3, accounts, test_resolver, runner) {
    return new Promise(function(accept, reject) {
      global.web3 = web3;
      global.assert = chai.assert;
      global.expect = chai.expect;
      global.artifacts = {
        require: function(import_path) {
          return test_resolver.require(import_path);
        }
      };

      var template = function(tests) {
        this.timeout(runner.TEST_TIMEOUT);

        before("prepare suite", function(done) {
          this.timeout(runner.BEFORE_TIMEOUT);
          runner.initialize(done);
        });

        beforeEach("before test", function(done) {
          runner.startTest(this, done);
        });

        afterEach("after test", function(done) {
          runner.endTest(this, done);
        });

        tests(accounts);
      };

      global.contract = function(name, tests) {
        Mocha.describe("Contract: " + name, function() { template.bind(this, tests)(); });
      };

      global.contract.only = function(name, tests){
        Mocha.describe.only("Contract: " + name, function() { template.bind(this, tests)(); });
      };

      global.contract.skip = function(name, tests){
        Mocha.describe.skip("Contract: " + name, function() { template.bind(this, tests)(); });
      };

      accept();
    });
  }
};

module.exports = Test;
