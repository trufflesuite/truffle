var Mocha = require("mocha");
var chai = require("chai");
var path = require("path");
var Web3 = require("web3");
var Config = require("truffle-config");
var Contracts = require("truffle-workflow-compile");
var Resolver = require("truffle-resolver");
var TestRunner = require("./testing/testrunner");
var TestResolver = require("./testing/testresolver");
var TestSource = require("./testing/testsource");
var SolidityTest = require("./testing/soliditytest");
var expect = require("truffle-expect");
var Migrate = require("truffle-migrate");
var Profiler = require("truffle-compile/profiler.js");
var originalrequire = require("original-require");

chai.use(require("./assertions"));

const Test = {
  run: function(options, callback) {
    const self = this;

    expect.options(options, [
      "contracts_directory",
      "contracts_build_directory",
      "migrations_directory",
      "test_files",
      "network",
      "network_id",
      "provider"
    ]);

    const config = Config.default().merge(options);

    config.test_files = config.test_files.map(testFile => {
      return path.resolve(testFile);
    });

    // `accounts` will be populated before each contract() invocation
    // and passed to it so tests don't have to call it themselves.
    const web3 = new Web3();
    web3.setProvider(config.provider);

    // Override console.warn() because web3 outputs gross errors to it.
    // e.g., https://github.com/ethereum/web3.js/blob/master/lib/web3/allevents.js#L61
    // Output looks like this during tests: https://gist.github.com/tcoulter/1988349d1ec65ce6b958
    const warn = config.logger.warn;
    config.logger.warn = message => {
      if (message === "cannot find event for log") {
        return;
      } else {
        if (warn) warn.apply(console, arguments);
      }
    };

    var mocha = this.createMocha(config);

    const jsTests = config.test_files.filter(file => {
      return path.extname(file) !== ".sol";
    });

    const solTests = config.test_files.filter(file => {
      return path.extname(file) === ".sol";
    });

    // Add Javascript tests because there's nothing we need to do with them.
    // Solidity tests will be handled later.
    jsTests.forEach(file => {
      // There's an idiosyncracy in Mocha where the same file can't be run twice
      // unless we delete the `require` cache.
      // https://github.com/mochajs/mocha/issues/995
      delete originalrequire.cache[file];

      mocha.addFile(file);
    });

    let dependencyPaths = [];
    let testContracts = [];
    let accounts = [];
    let runner, testResolver;
    this.getAccounts(web3)
      .then(function(accs) {
        accounts = accs;

        if (!config.resolver) config.resolver = new Resolver(config);

        const testSource = new TestSource(config);
        testResolver = new TestResolver(
          config.resolver,
          testSource,
          config.contracts_build_directory
        );
        testResolver.cache_on = false;

        return self.compileContractsWithTestFilesIfNeeded(
          solTests,
          config,
          testResolver
        );
      })
      .then(function(paths) {
        dependencyPaths = paths;

        testContracts = solTests.map(test_file_path => {
          return testResolver.require(test_file_path);
        });

        runner = new TestRunner(config);

        return self.performInitialDeploy(config, testResolver);
      })
      .then(function() {
        return self.defineSolidityTests(
          mocha,
          testContracts,
          dependencyPaths,
          runner
        );
      })
      .then(function() {
        return self.setJSTestGlobals(web3, accounts, testResolver, runner);
      })
      .then(function() {
        // Finally, run mocha.
        process.on("unhandledRejection", reason => {
          throw reason;
        });

        mocha.run(function(failures) {
          config.logger.warn = warn;

          callback(failures);
        });
      })
      .catch(callback);
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

  getAccounts: function(web3) {
    return web3.eth.getAccounts();
  },

  compileContractsWithTestFilesIfNeeded: function(
    solidityTestFiles,
    config,
    testResolver
  ) {
    return new Promise(function(accept, reject) {
      Profiler.updated(
        config.with({
          resolver: testResolver
        }),
        function(err, updated) {
          if (err) return reject(err);

          updated = updated || [];

          // Compile project contracts and test contracts
          Contracts.compile(
            config.with({
              all: config.compileAll === true,
              files: updated.concat(solidityTestFiles),
              resolver: testResolver,
              quiet: false,
              quietWrite: true
            }),
            function(err, result) {
              if (err) return reject(err);
              const paths = result.outputs.solc;
              accept(paths);
            }
          );
        }
      );
    });
  },

  performInitialDeploy: function(config, resolver) {
    return new Promise(function(accept, reject) {
      Migrate.run(
        config.with({
          reset: true,
          resolver: resolver,
          quiet: true
        })
      )
        .then(() => {
          accept();
        })
        .catch(error => {
          reject(error);
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
    return new Promise(function(accept) {
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
        Mocha.describe("Contract: " + name, function() {
          template.bind(this, tests)();
        });
      };

      global.contract.only = function(name, tests) {
        Mocha.describe.only("Contract: " + name, function() {
          template.bind(this, tests)();
        });
      };

      global.contract.skip = function(name, tests) {
        Mocha.describe.skip("Contract: " + name, function() {
          template.bind(this, tests)();
        });
      };

      accept();
    });
  }
};

module.exports = Test;
