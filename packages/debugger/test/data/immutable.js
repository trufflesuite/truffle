import debugModule from "debug";
const debug = debugModule("test:data:immutable");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import * as Codec from "@truffle/codec";

import solidity from "lib/solidity/selectors";

const __IMMUTABLE = `
pragma solidity ^0.6.5;

contract Base {
  uint8 immutable base = 37;
}

contract ImmutableTest is Base {
  enum Color {
    Red, Green, Blue
  }

  Color immutable background;
  bool immutable truth;
  address immutable self;
  byte immutable secret;

  event Done();

  constructor() public {
    background = Color.Blue;
    truth = true;
    self = address(this);
    secret = 0x88;
    emit Done(); //BREAK CONSTRUCTOR
  }

  event Number(uint8);
  event Enum(Color);
  event Bool(bool);
  event Address(address);
  event Byte(byte);

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

describe("Immutable state variables", function() {
  var provider;

  var abstractions;
  var compilations;

  before("Create Provider", async function() {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Decodes immutables properly in deployed contract", async function() {
    this.timeout(9000);
    let instance = await abstractions.ImmutableTest.deployed();
    let address = instance.address;
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    let compilationId = session.view(solidity.current.source).compilationId;
    let source = session.view(solidity.current.source).source;
    await session.addBreakpoint({
      sourceId,
      compilationId,
      line: lineOf("BREAK DEPLOYED", source)
    });

    await session.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await session.variables()
    );

    const expectedResult = {
      base: 37,
      background: "ImmutableTest.Color.Blue",
      truth: true,
      self: address,
      secret: "0x88"
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Decodes immutables properly in constructor", async function() {
    this.timeout(9000);
    let instance = await abstractions.ImmutableTest.new();
    let address = instance.address;
    let txHash = instance.transactionHash;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    let compilationId = session.view(solidity.current.source).compilationId;
    let source = session.view(solidity.current.source).source;
    await session.addBreakpoint({
      sourceId,
      compilationId,
      line: lineOf("BREAK CONSTRUCTOR", source)
    });

    await session.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await session.variables()
    );

    const expectedResult = {
      base: 37,
      background: "ImmutableTest.Color.Blue",
      truth: true,
      self: address,
      secret: "0x88"
    };

    assert.deepInclude(variables, expectedResult);
  });
});
