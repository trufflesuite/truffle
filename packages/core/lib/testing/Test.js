const colors = require("colors");
const chai = require("chai");
const path = require("path");
const {
  Web3Shim,
  createInterfaceAdapter
} = require("@truffle/interface-adapter");
const Config = require("@truffle/config");
const WorkflowCompile = require("@truffle/workflow-compile");
const Resolver = require("@truffle/resolver");
const TestRunner = require("./TestRunner");
const SolidityTest = require("./SolidityTest");
const RangeUtils = require("@truffle/compile-solidity/compilerSupplier/rangeUtils");
const expect = require("@truffle/expect");
const Migrate = require("@truffle/migrate");
const Profiler = require("@truffle/compile-solidity/profiler");
const originalrequire = require("original-require");
const Codec = require("@truffle/codec");
const debug = require("debug")("lib:test");
const Debugger = require("@truffle/debugger");

let Mocha; // Late init with "mocha" or "mocha-parallel-tests"

chai.use(require("../assertions"));

const Test = {
  run: async function (options) {
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

    const interfaceAdapter = createInterfaceAdapter({
      provider: config.provider,
      networkType: config.networks[config.network].type
    });

    // `accounts` will be populated before each contract() invocation
    // and passed to it so tests don't have to call it themselves.
    const web3 = new Web3Shim({
      provider: config.provider,
      networkType: config.networks[config.network].type
        ? config.networks[config.network].type
        : "web3js"
    });

    // Override console.warn() because web3 outputs gross errors to it.
    // e.g., https://github.com/ethereum/web3.js/blob/master/lib/web3/allevents.js#L61
    // Output looks like this during tests: https://gist.github.com/tcoulter/1988349d1ec65ce6b958
    const warn = config.logger.warn;
    config.logger.warn = function (message) {
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

    const accounts = await this.getAccounts(interfaceAdapter);

    const testResolver = new Resolver(config, {
      includeTruffleSources: true
    });

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

    const sourcePaths = []
      .concat(
        ...compilations.map(compilation => compilation.sourceIndexes) //we don't need the indices here, just the paths
      )
      .filter(path => path); //make sure we don't pass in any undefined

    await this.defineSolidityTests(mocha, testContracts, sourcePaths, runner);

    const debuggerCompilations = Codec.Compilations.Utils.shimCompilations(
      compilations
    );

    //for stack traces, we'll need to set up a light-mode debugger...
    let bugger;
    if (config.stacktrace) {
      debug("stacktraces on!");
      bugger = await Debugger.forProject({
        compilations: debuggerCompilations,
        provider: config.provider,
        lightMode: true
      });
    }

    await this.setJSTestGlobals({
      config,
      web3,
      interfaceAdapter,
      accounts,
      testResolver,
      runner,
      compilations: debuggerCompilations,
      bugger
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

  createMocha: function (config) {
    // Allow people to specify config.mocha in their config.
    const mochaConfig = config.mocha || {};

    // Propagate --bail option to mocha
    mochaConfig.bail = config.bail;

    // If the command line overrides color usage, use that.
    if (config.color != null) {
      mochaConfig.color = config.color;
    } else if (config.colors != null) {
      // --colors is a mocha alias for --color
      mochaConfig.color = config.colors;
    }

    // Default to true if configuration isn't set anywhere.
    if (mochaConfig.color == null) {
      mochaConfig.color = true;
    }

    Mocha = mochaConfig.package || require("mocha");
    delete mochaConfig.package;
    const mocha = new Mocha(mochaConfig);

    return mocha;
  },

  getAccounts: function (interfaceAdapter) {
    return interfaceAdapter.getAccounts();
  },

  compileContractsWithTestFilesIfNeeded: async function (
    solidityTestFiles,
    config,
    testResolver
  ) {
    const updated =
      (await Profiler.updated(config.with({ resolver: testResolver }))) || [];

    const compiler =
      config.compileNone || config["--compile-none"] ? "none" : config.compiler;

    let compileConfig = config.with({
      all: config.compileAll === true,
      compiler,
      files: updated.concat(solidityTestFiles),
      resolver: testResolver,
      quiet: config.runnerOutputOnly || config.quiet,
      quietWrite: true
    });
    if (config.compileAllDebug) {
      let versionString = ((compileConfig.compilers || {}).solc || {}).version;
      versionString = RangeUtils.resolveToRange(versionString);
      if (RangeUtils.rangeContainsAtLeast(versionString, "0.6.3")) {
        compileConfig = compileConfig.merge({
          compilers: {
            solc: {
              settings: {
                debug: {
                  revertStrings: "debug"
                }
              }
            }
          }
        });
      } else {
        config.logger.log(
          `\n${colors.bold(
            "Warning:"
          )} Extra revert string info requires Solidity v0.6.3 or higher. For more\n  information, see release notes <https://github.com/ethereum/solidity/releases/tag/v0.6.3>`
        );
      }
    }

    // Compile project contracts and test contracts
    const { contracts, compilations } = await WorkflowCompile.compileAndSave(
      compileConfig
    );

    return {
      contracts,
      compilations
    };
  },

  performInitialDeploy: function (config, resolver) {
    const migrateConfig = config.with({
      reset: true,
      resolver: resolver,
      quiet: true
    });
    return Migrate.run(migrateConfig);
  },

  defineSolidityTests: async (mocha, contracts, dependencyPaths, runner) => {
    for (const contract of contracts) {
      await SolidityTest.define(contract, dependencyPaths, runner, mocha);
      debug("defined solidity tests for %s", contract.contractName);
    }
  },

  setJSTestGlobals: async function ({
    config,
    web3,
    interfaceAdapter,
    accounts,
    testResolver,
    runner,
    compilations,
    bugger //for stacktracing
  }) {
    global.interfaceAdapter = interfaceAdapter;
    global.web3 = web3;
    global.assert = chai.assert;
    global.expect = chai.expect;
    global.artifacts = {
      require: importPath => {
        let contract = testResolver.require(importPath);
        //HACK: both of the following should go by means
        //of the provisioner, but I'm not sure how to make
        //that work at the moment
        contract.reloadJson = function () {
          const reloaded = testResolver.require(importPath);
          this._json = reloaded._json;
        };
        if (bugger) {
          contract.debugger = bugger;
        }
        return contract;
      }
    };
    global.config = config.normalize(config);

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
      const { CLIDebugHook } = require("../debug/mocha");

      // note: this.mochaRunner will be available by the time debug()
      // is invoked
      const hook = new CLIDebugHook(config, compilations, this.mochaRunner);

      return await hook.debug(operation);
    };

    const template = function (tests) {
      this.timeout(runner.TEST_TIMEOUT);

      before("prepare suite", async function () {
        this.timeout(runner.BEFORE_TIMEOUT);
        await runner.initialize();
      });

      beforeEach("before test", async function () {
        await runner.startTest();
      });

      afterEach("after test", async function () {
        await runner.endTest(this);
      });

      tests(accounts);
    };

    global.contract = function (name, tests) {
      Mocha.describe("Contract: " + name, function () {
        template.bind(this, tests)();
      });
    };

    global.contract.only = function (name, tests) {
      Mocha.describe.only("Contract: " + name, function () {
        template.bind(this, tests)();
      });
    };

    global.contract.skip = function (name, tests) {
      Mocha.describe.skip("Contract: " + name, function () {
        template.bind(this, tests)();
      });
    };
  }
};

module.exports = Test;
