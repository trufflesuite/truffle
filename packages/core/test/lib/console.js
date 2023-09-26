const assert = require("chai").assert;
const path = require("path");
const { Console } = require("../../lib/console");
const sinon = require("sinon");
const Config = require("@truffle/config");
const { Resolver } = require("@truffle/resolver");
const config = new Config();

let truffleConsole, consoleOptions;

describe("Console", function () {
  describe("Console.calculateTruffleAndUserGlobals", function () {
    let provider;

    before(function () {
      // no need to provide an actual provider for these tests
      // we just need to make sure that the provider is not undefined
      // we already mock the interfaceAdapter.getAccounts method
      provider = {};
    });
    beforeEach(function () {
      consoleOptions = new Config().with({
        network: "funTimeNetwork",
        networks: {
          funTimeNetwork: {
            type: "ethereum"
          }
        },
        network_id: 666,
        provider,
        resolver: new Resolver(config)
      });
      const pathToUserJs = path.join(
        config.working_directory,
        "test/sources/userVariables.js"
      );
      const pathToMoreUserJs = path.join(
        config.working_directory,
        "test/sources/moreUserVariables.js"
      );
      consoleOptions.console.require = [
        pathToUserJs,
        { path: pathToMoreUserJs },
        { path: pathToUserJs, as: "namespace" }
      ];
      truffleConsole = new Console(consoleOptions);
      sinon
        .stub(truffleConsole.interfaceAdapter, "getAccounts")
        .returns(new Promise(resolve => resolve(["0x0"])));
    });
    afterEach(function () {
      truffleConsole.interfaceAdapter.getAccounts.restore();
    });

    it("sets web3, the interface adapter, and accounts variables", async function () {
      const result = await truffleConsole.calculateTruffleAndUserGlobals();
      assert(result.web3);
      assert(result.interfaceAdapter);
      assert.equal(result.accounts[0], "0x0");
    });

    it("adds the JS to the environment (repl.context)", async function () {
      const result = await truffleConsole.calculateTruffleAndUserGlobals();
      assert.equal(result.bingBam, "boom");
      assert.equal(result.abraham, "lincoln");
      assert.equal(result.namespace.bingBam, "boom");
    });

    describe("when options['require-none'] is set to true", async function () {
      let otherConsoleOptions, otherTruffleConsole;
      beforeEach(function () {
        otherConsoleOptions = new Config().with({
          network: "funTimeNetwork",
          networks: {
            funTimeNetwork: {
              type: "ethereum"
            }
          },
          network_id: 666,
          provider,
          resolver: new Resolver(config)
        });
        otherConsoleOptions.require = path.join(
          config.working_directory,
          "test/sources/userVariables.js"
        );
        otherConsoleOptions.r = path.join(
          config.working_directory,
          "test/sources/moreUserVariables.js"
        );
        otherConsoleOptions["require-none"] = true;
        otherTruffleConsole = new Console(otherConsoleOptions);
      });

      it("won't load any user-defined JS", async function () {
        const result =
          await otherTruffleConsole.calculateTruffleAndUserGlobals();
        assert.equal(typeof result.bingBam, "undefined");
        assert.equal(typeof result.abraham, "undefined");
      });
    });

    describe("when there are name conflicts with user-supplied variables", function () {
      let otherConsoleOptions, otherTruffleConsole;
      beforeEach(function () {
        otherConsoleOptions = new Config().with({
          network: "funTimeNetwork",
          networks: {
            funTimeNetwork: {
              type: "ethereum"
            }
          },
          network_id: 666,
          provider,
          resolver: new Resolver(config)
        });
        otherConsoleOptions.console.require = path.join(
          config.working_directory,
          "test/sources/nameConflicts.js"
        );
        otherTruffleConsole = new Console(otherConsoleOptions);
      });

      it("won't let users clobber Truffle variables", async function () {
        const result =
          await otherTruffleConsole.calculateTruffleAndUserGlobals();
        assert.notEqual(result.accounts, "0x666");
        assert.notEqual(result.web3, "fakeWeb3");
        assert.notEqual(result.interfaceAdapter, "fakeInterfaceAdapter");
      });
    });

    describe("other ways of accessing options.console.require", function () {
      let otherConsoleOptions, otherTruffleConsole;
      beforeEach(function () {
        otherConsoleOptions = new Config().with({
          network: "funTimeNetwork",
          networks: {
            funTimeNetwork: {
              type: "ethereum"
            }
          },
          network_id: 666,
          provider,
          resolver: new Resolver(config)
        });
        otherTruffleConsole = new Console(otherConsoleOptions);
      });

      it("accepts options.r", async function () {
        otherConsoleOptions.require = path.join(
          config.working_directory,
          "test/sources/userVariables.js"
        );
        const result =
          await otherTruffleConsole.calculateTruffleAndUserGlobals();
        assert.equal(result.bingBam, "boom");
      });

      it("accepts options.require", async function () {
        otherConsoleOptions.r = path.join(
          config.working_directory,
          "test/sources/userVariables.js"
        );
        const result =
          await otherTruffleConsole.calculateTruffleAndUserGlobals();
        assert.equal(result.bingBam, "boom");
      });

      it("accepts options.r over options.require", async function () {
        otherConsoleOptions.r = path.join(
          config.working_directory,
          "test/sources/moreUserVariables.js"
        );
        otherConsoleOptions.require = path.join(
          config.working_directory,
          "test/sources/userVariables.js"
        );
        const result =
          await otherTruffleConsole.calculateTruffleAndUserGlobals();
        assert.equal(result.abraham, "lincoln");
        assert.notEqual(result.bingBam, "boom");
      });
    });
  });
});
