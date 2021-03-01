import debugModule from "debug";
const debug = debugModule("debugger:test:data:global");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "../helpers";
import Debugger from "lib/debugger";

import * as Codec from "@truffle/codec";

const __TESTER = `
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Constants.sol";

uint constant unity = 1;

contract ConstTest {
  function run() public {
  }
}
`;

const __CONSTANTS = `
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

uint constant secret = 77;

contract Dummy { //just here for artifact purposes
}
`;

let sources = {
  "ConstTest.sol": __TESTER,
  "Constants.sol": __CONSTANTS
};

describe("Globally-defined constants", function () {
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

  it("Gets globally-defined constants, including imports", async function () {
    this.timeout(8000);
    let instance = await abstractions.ConstTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    //file-level constants should be available right away
    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      unity: 1,
      secret: 77
    };

    assert.deepInclude(variables, expectedResult);
  });
});
