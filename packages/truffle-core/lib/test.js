const Mocha = require("mocha");
const colors = require("colors");
const chai = require("chai");
const path = require("path");
const Web3 = require("web3");
const Config = require("truffle-config");
const Contracts = require("truffle-workflow-compile/new");
const Resolver = require("truffle-resolver");
const TestRunner = require("./testing/testrunner");
const TestResolver = require("./testing/testresolver");
const TestSource = require("./testing/testsource");
const SolidityTest = require("./testing/soliditytest");
const expect = require("@truffle/expect");
const Migrate = require("truffle-migrate");
const Profiler = require("truffle-compile/profiler");
const originalrequire = require("original-require");

chai.use(require("./assertions"));

const Test = {
  run: async function(options) {
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

    const mocha = this.createMocha(config);

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

    const accounts = await this.getAccounts(web3);

    if (!config.resolver) config.resolver = new Resolver(config);

    const testSource = new TestSource(config);
    const testResolver = new TestResolver(
      config.resolver,
      testSource,
      config.contracts_build_directory
    );
    testResolver.cache_on = false;

    const { compilations } = await this.compileContractsWithTestFilesIfNeeded(
      solTests,
      config,
      testResolver
    );

    const testContracts = solTests.map(testFilePath => {
      return testResolver.require(testFilePath);
    });

    const runner = new TestRunner(config);

    await this.performInitialDeploy(config, testResolver);

    await this.defineSolidityTests(
      mocha,
      testContracts,
      compilations.solc.sourceIndexes,
      runner
    );

    await this.setJSTestGlobals({
      config,
      web3,
      accounts,
      testResolver,
      runner,
      compilation: compilations.solc
    });

    // Finally, run mocha.
    process.on("unhandledRejection", reason => {
      throw reason;
    });

    return new Promise(resolve => {
      this.mochaRunner = mocha.run(failures => {
        config.logger.warn = warn;

        resolve(failures);
      });
    });
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

  compileContractsWithTestFilesIfNeeded: async function(
    solidityTestFiles,
    config,
    testResolver
  ) {
    const updated =
      (await Profiler.updated(config.with({ resolver: testResolver }))) || [];

    const compileConfig = config.with({
      all: config.compileAll === true,
      files: updated.concat(solidityTestFiles),
      resolver: testResolver,
      quiet: config.quiet,
      quietWrite: true
    });

    // Compile project contracts and test contracts
    const { contracts, compilations } = await Contracts.compile(compileConfig);

    await Contracts.save(compileConfig, contracts);

    return {
      contracts,
      compilations
    };
  },

  performInitialDeploy: function(config, resolver) {
    const migrateConfig = config.with({
      reset: true,
      resolver: resolver,
      quiet: true
    });
    return Migrate.run(migrateConfig);
  },

  defineSolidityTests: function(mocha, contracts, dependencyPaths, runner) {
    return new Promise(resolve => {
      contracts.forEach(contract => {
        SolidityTest.define(contract, dependencyPaths, runner, mocha);
      });

      resolve();
    });
  },

  setJSTestGlobals: function({
    config,
    web3,
    accounts,
    testResolver,
    runner,
    compilation
  }) {
    return new Promise(accept => {
      global.web3 = web3;
      global.assert = chai.assert;
      global.expect = chai.expect;
      global.artifacts = {
        require: import_path => testResolver.require(import_path)
      };

      global[config.debugGlobal] = async operation => {
        if (!config.debug) {
          config.logger.log(
            `${colors.bold(
              "Warning:"
            )} Invoked in-test debugger without --debug flag. ` +
              `Try: \`truffle test --debug\``
          );
          return operation;
        }

        // wrapped inside function so as not to load debugger on every test
        const { CLIDebugHook } = require("./debug/mocha");

        // note: this.mochaRunner will be available by the time debug()
        // is invoked
        const hook = new CLIDebugHook(config, compilation, this.mochaRunner);

        return await hook.debug(operation);
      };

      const template = function(tests) {
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
