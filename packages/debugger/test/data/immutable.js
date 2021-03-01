import debugModule from "debug";
const debug = debugModule("debugger:test:data:immutable");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import * as Codec from "@truffle/codec";

import solidity from "lib/solidity/selectors";

const __IMMUTABLE = `
pragma solidity ^0.8.0;

contract Base {
  int8 immutable base = -37;
}

contract ImmutableTest is Base {
  enum Color {
    Red, Green, Blue
  }

  Color immutable background;
  bool immutable truth;
  address immutable self;
  bytes1 immutable secret;
  uint8 immutable trulySecret;

  event Done();

  constructor() {
    background = Color.Blue;
    truth = true;
    self = address(this);
    secret = 0x88;
    trulySecret = 23;
    emit Done(); //BREAK CONSTRUCTOR
  }

  event Number(int8);
  event Enum(Color);
  event Bool(bool);
  event Address(address);
  event Byte(bytes1);

  function run() public {
    emit Number(base);
    emit Enum(background);
    emit Bool(truth);
    emit Address(self);
    emit Byte(secret);
    emit Done(); //BREAK DEPLOYED
  }
}
`;

let sources = {
  "Immutable.sol": __IMMUTABLE
};

describe("Immutable state variables", function () {
  var provider;

  var abstractions;
  var compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Decodes immutables properly in deployed contract", async function () {
    this.timeout(9000);
    let instance = await abstractions.ImmutableTest.deployed();
    let address = instance.address;
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK DEPLOYED", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      base: -37,
      background: "ImmutableTest.Color.Blue",
      truth: true,
      self: address,
      secret: "0x88"
    };

    assert.deepInclude(variables, expectedResult);

    const trulySecret = await bugger.variable("trulySecret");
    assert.strictEqual(trulySecret.kind, "error");
    assert.strictEqual(trulySecret.error.kind, "UnusedImmutableError");
  });

  it("Decodes immutables properly in constructor", async function () {
    this.timeout(9000);
    let instance = await abstractions.ImmutableTest.new();
    let address = instance.address;
    let txHash = instance.transactionHash;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK CONSTRUCTOR", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      base: -37,
      background: "ImmutableTest.Color.Blue",
      truth: true,
      self: address,
      secret: "0x88",
      trulySecret: 23
    };

    assert.deepInclude(variables, expectedResult);
  });
});
