import debugModule from "debug";
const debug = debugModule("debugger:test:data:ens");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, testBlockGasLimit } from "../helpers";
import Debugger from "lib/debugger";

const __ENS_TEST = `
pragma solidity ^0.8.0;

contract EnsTest {

  address namedAddress;
  address public registryAddress;

  constructor(address _registryAddress) {
    namedAddress = msg.sender;
    registryAddress = _registryAddress;
  }

  event Named(address);

  function run() public {
    emit Named(namedAddress); //make use of the variable so debugger can see it
  }
}
`;

const __MIGRATION = `
const EnsTest = artifacts.require("EnsTest");

module.exports = async function (deployer, _, accounts) {
  const name = "myexample.eth";
  await deployer.ens.setAddress(name, accounts[0], { from: accounts[0] });
  const registryAddress = deployer.ens.devRegistry.address;
  await deployer.ens.ensjs.setReverseRecord(name); //sets it for accounts[0]
  await deployer.deploy(EnsTest, registryAddress);
};
`;

const sources = {
  "EnsTest.sol": __ENS_TEST
};

const migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("ENS", function () {
  let provider;

  let abstractions;
  let compilations;

  let registryAddress;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "debugger",
      logging: {
        quiet: true
      },
      miner: {
        instamine: "eager", //this isn't ideal, but these tests don't work otherwise?
        blockGasLimit: testBlockGasLimit
      }
    });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    const prepared = await prepareContracts(
      provider,
      sources,
      migrations,
      true
    ); //last flag turns on ENS
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;

    const deployedContract = await abstractions.EnsTest.deployed();
    registryAddress = await deployedContract.registryAddress();
  });

  it("Includes ENS names for addresses", async function () {
    this.timeout(8000);
    const instance = await abstractions.EnsTest.deployed();
    const receipt = await instance.run();
    const txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      ens: { registryAddress }
    });

    await bugger.runToEnd();

    const namedAddressResult = await bugger.variable("namedAddress");

    debug("what we got: %O", namedAddressResult);
    assert.property(namedAddressResult.interpretations, "ensName");
    assert.equal(namedAddressResult.interpretations.ensName.kind, "valid");
    assert.equal(
      namedAddressResult.interpretations.ensName.asString,
      "myexample.eth"
    );
  });

  it("Does not include ENS names when turned off", async function () {
    this.timeout(8000);
    const instance = await abstractions.EnsTest.deployed();
    const receipt = await instance.run();
    const txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      ens: { registryAddress: null }
    });

    await bugger.runToEnd();

    const namedAddressResult = await bugger.variable("namedAddress");

    debug("what we got: %O", namedAddressResult);
    assert.notProperty(namedAddressResult.interpretations, "ensName");
  });
});
