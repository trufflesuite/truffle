import colors from "colors";
import chai from "chai";
import path = require("path");
import { Web3Shim, createInterfaceAdapter } from "@truffle/interface-adapter";
import Config from "@truffle/config";
import WorkflowCompile from "@truffle/workflow-compile";
import { Resolver } from "@truffle/resolver";
import { TestRunner } from "./TestRunner";
import { SolidityTest } from "./SolidityTest";
import RangeUtils from "@truffle/compile-solidity/dist/compilerSupplier/rangeUtils";
import expect from "@truffle/expect";
import Migrate from "@truffle/migrate";
import { Profiler } from "@truffle/compile-solidity/dist/profiler";
import originalrequire from "original-require";
import Codec from "@truffle/codec";
import debugModule from "debug";
const debug = debugModule("lib:test");
import Debugger from "@truffle/debugger";
import type { Compilation, CompiledContract } from "@truffle/compile-common";
import Web3 from "web3";

let Mocha: any; // Late init with "mocha" or "mocha-parallel-tests"

chai.use(require("./assertions"));

type GenerateDebug = (options: {
  mochaRunner: any;
  config: Config;
  compilations: Compilation[];
}) => (operation: any) => any;

interface SetJSTestGlobalsInterface {
  config: Config;
  web3: Web3;
  interfaceAdapter: ReturnType<typeof createInterfaceAdapter>;
  accounts: string[];
  testResolver: Resolver;
  runner: any;
  compilations: Compilation[];
  bugger: Debugger; //for stacktracing
  generateDebug: GenerateDebug;
}

export const Test = {
  run: async function (options: Config, generateDebug: GenerateDebug) {
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

    config.test_files = config.test_files.map((testFile: string) => {
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
    config.logger.warn = function (message: string) {
      if (message === "cannot find event for log") {
        return;
      } else {
        if (warn) warn.apply(console, arguments);
      }
    };

    const mocha = this.createMocha(config);

    const jsTests = config.test_files.filter((file: string) => {
      return path.extname(file) !== ".sol";
    });

    const solTests = config.test_files.filter((file: string) => {
      return path.extname(file) === ".sol";
    });

    // Add Javascript tests because there's nothing we need to do with them.
    // Solidity tests will be handled later.
    jsTests.forEach((file: string) => {
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

    const testContracts = solTests.map((testFilePath: string) => {
      return testResolver.require(testFilePath);
    });

    const runner = new TestRunner(config);

    if (config.migrateNone || config["migrate-none"]) {
      if (config.events) {
        config.events.emit("test:migration:skipped");
      }
    } else {
      await this.performInitialDeploy(config, testResolver);
    }

    const sourcePaths = []
      .concat(
        ...compilations.map(
          (compilation: Compilation) => compilation.sourceIndexes
        ) //we don't need the indices here, just the paths
      )
      .filter(path => path); //make sure we don't pass in any undefined

    await this.defineSolidityTests(mocha, testContracts, sourcePaths, runner);

    const debuggerCompilations =
      Codec.Compilations.Utils.shimCompilations(compilations);

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
      bugger,
      generateDebug
    });

    // Finally, run mocha.
    process.on("unhandledRejection", reason => {
      throw reason;
    });

    return new Promise(resolve => {
      this.mochaRunner = mocha.run((failures: number) => {
        config.logger.warn = warn;
        resolve(failures);
      });
    });
  },

  createMocha: function (config: Config) {
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

  getAccounts: function (
    interfaceAdapter: ReturnType<typeof createInterfaceAdapter>
  ) {
    return interfaceAdapter.getAccounts();
  },

  compileContractsWithTestFilesIfNeeded: async function (
    solidityTestFiles: string[],
    config: Config,
    testResolver: Resolver
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

  performInitialDeploy: function (config: Config, resolver: Resolver) {
    const migrateConfig = config.with({
      reset: true,
      resolver: resolver,
      quiet: true
    });
    return Migrate.run(migrateConfig);
  },

  defineSolidityTests: async (
    mocha: any,
    contracts: CompiledContract[],
    dependencyPaths: string[],
    runner: any
  ) => {
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
    bugger, //for stacktracing
    generateDebug
  }: SetJSTestGlobalsInterface) {
    // @ts-ignore
    global.interfaceAdapter = interfaceAdapter;
    // @ts-ignore
    global.web3 = web3;
    // @ts-ignore
    global.assert = chai.assert;
    // @ts-ignore
    global.expect = chai.expect;
    // @ts-ignore
    global.artifacts = {
      require: (importPath: string) => {
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
    // @ts-ignore
    global.config = config.normalize(config);

    // @ts-ignore
    global[config.debugGlobal] = generateDebug({
      compilations,
      mochaRunner: this.mochaRunner,
      config
    });

    const template = function (tests: (accounts: string[]) => any) {
      this.timeout(runner.TEST_TIMEOUT);

      // @ts-ignore
      before("prepare suite", async function () {
        this.timeout(runner.BEFORE_TIMEOUT);
        await runner.initialize();
      });

      // @ts-ignore
      beforeEach("before test", async function () {
        await runner.startTest();
      });

      // @ts-ignore
      afterEach("after test", async function () {
        await runner.endTest(this);
      });

      tests(accounts);
    };

    // @ts-ignore
    global.contract = function (name, tests) {
      Mocha.describe("Contract: " + name, function () {
        template.bind(this, tests)();
      });
    };

    // @ts-ignore
    global.contract.only = function (name, tests) {
      Mocha.describe.only("Contract: " + name, function () {
        template.bind(this, tests)();
      });
    };

    // @ts-ignore
    global.contract.skip = function (name, tests) {
      Mocha.describe.skip("Contract: " + name, function () {
        template.bind(this, tests)();
      });
    };
  }
};
