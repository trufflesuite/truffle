import debugModule from "debug";
const debug = debugModule("debugger:test:context");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, testBlockGasLimit } from "./helpers";
import Debugger from "lib/debugger";

import sessionSelector from "lib/session/selectors";

const __IMMUTABLE = `
event Num:
    num: int128

imm: immutable(int128)

@external
def __init__(x: int128):
    imm = x

@external
def report():
    log Num(imm)
`;

const __MIGRATION = `
const ImmutableTest = artifacts.require("ImmutableTest");

module.exports = function(deployer) {
  deployer.deploy(ImmutableTest, 107);
};
`;

const migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

const sources = {
  "ImmutableTest.vy": __IMMUTABLE
};

describe("Contexts (Vyper)", function () {
  let provider;
  let abstractions;
  let compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "debugger",
      logging: {
        quiet: true
      },
      miner: {
        instamine: "strict",
        blockGasLimit: testBlockGasLimit
      }
    });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);
    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("correctly identifies context in presence of immutables", async function () {
    let ImmutableTest = await abstractions.ImmutableTest.deployed();
    let address = ImmutableTest.address;

    // run outer contract method
    let result = await ImmutableTest.report();

    let txHash = result.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });
    debug("debugger ready");

    let affectedInstances = bugger.view(sessionSelector.info.affectedInstances);
    debug("affectedInstances: %o", affectedInstances);

    assert.property(affectedInstances, address);
    assert.equal(affectedInstances[address].contractName, "ImmutableTest");
  });
});
