const assert = require("chai").assert;
const Console = require("../../lib/console");
const commands = require("../../lib/commands");
const sinon = require("sinon");
const Config = require("@truffle/config");
const Web3 = require("web3");
const Resolver = require("@truffle/resolver");
const config = new Config();
const consoleOptions = new Config().with({
  network: "funTimeNetwork",
  networks: {
    funTimeNetwork: {
      type: "ethereum"
    }
  },
  network_id: 666,
  provider: new Web3.providers.HttpProvider("http://localhost:666"),
  resolver: new Resolver(config)
});

// Console uses the following for instantiation in packages/core/lib/console.js
const excluded = new Set(["console", "init", "watch", "develop"]);
const consoleCommands = Object.keys(commands).reduce((acc, name) => {
  return !excluded.has(name)
    ? Object.assign(acc, {[name]: commands[name]})
    : acc;
}, {});
let truffleConsole;

describe("Console", function () {
  beforeEach(function () {
    truffleConsole = new Console(consoleCommands, consoleOptions);
    // this is just a stub for the repl.context to check for variables added
    truffleConsole.repl = { context: {} };
    sinon.stub(truffleConsole.interfaceAdapter, "getAccounts").returns(["0x0"]);
    sinon.stub(truffleConsole, "hydrateUserDefinedVariables");
  });
  afterEach(function () {
    truffleConsole.interfaceAdapter.getAccounts.restore();
    truffleConsole.hydrateUserDefinedVariables.restore();
  });

  describe("Console.setUpEnvironment", function () {
    it("sets web3, the interface adapter, and accounts variables", async function () {
      await truffleConsole.setUpEnvironment();
      assert(truffleConsole.repl.context.web3);
      assert(truffleConsole.repl.context.interfaceAdapter);
      assert.equal(truffleConsole.repl.context.accounts[0], "0x0");
    });
  });
});
