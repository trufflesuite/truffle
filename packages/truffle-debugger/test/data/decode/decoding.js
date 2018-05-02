import debugModule from "debug";
const debug = debugModule("test:data:decode");

import { assert } from "chai";
import Ganache from "ganache-cli";
import Web3 from "web3";
import util from "util";

import { prepareContracts } from "test/helpers";

import Debugger from "lib/debugger";

import data from "lib/data/selectors";
import ast from "lib/ast/selectors";

const __STORAGE = `pragma solidity ^0.4.18;

contract StorageVars {
  event Ran();

  uint[] multipleFullWordArray;  // length 3, will take up 3 words
  uint16[] withinWordArray;  // length 10, will take up >1/2 word
  uint64[] multiplePartWordArray; // length 9, will take up 2.25 words

  uint240[] inconvenientlyWordOffsetArray; // length 3, takes 3.2 words

  function run() public {
    uint start = 1;
    uint i;

    for (i = 0; i < 3; i++) {
      multipleFullWordArray.push(start + i);
    }
    start = i;

    for (i = 0; i < 10; i++) {
      withinWordArray.push(uint16(start + i));
    }
    start = i;

    for (i = 0; i < 9; i++) {
      multiplePartWordArray.push(uint64(start + i));
    }
    start = i;

    for (i = 0; i < 3; i++) {
      inconvenientlyWordOffsetArray.push(uint240(start + i));
    }
    start = i;

    Ran();
  }
}
`;

function imitateRun() {
  let multipleFullWordArray = [];
  let withinWordArray = [];
  let multiplePartWordArray = [];
  let inconvenientlyWordOffsetArray = [];

  let start = 1;
  let i;

  for (i = 0; i < 3; i++) {
    multipleFullWordArray.push(start + i);
  }
  start = i;

  for (i = 0; i < 10; i++) {
    withinWordArray.push(start + i);
  }
  start = i;

  for (i = 0; i < 9; i++) {
    multiplePartWordArray.push(start + i);
  }
  start = i;

  for (i = 0; i < 3; i++) {
    inconvenientlyWordOffsetArray.push(start + i);
  }

  return {
    multipleFullWordArray,
    withinWordArray,
    multiplePartWordArray,
    inconvenientlyWordOffsetArray
  }

}

const sources = {
  "StorageVars.sol": __STORAGE,
}

describe("Data Decoding", function() {
  var provider;
  var web3;

  var abstractions;
  var artifacts;
  var files;
  var actualValues;

  before("Create Provider", async function() {
    provider = Ganache.provider({seed: "debugger", gasLimit: 7000000});
    web3 = new Web3(provider);
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources)
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
    files = prepared.files;
  });

  before("Run transaction, save decoded variable values", async function() {
    this.timeout(30000);

    let instance = await abstractions.StorageVars.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();
    var stepped;  // session steppers return false when done

    let breakpoint = { address: instance.address, line: 35 };

    session.continueUntil(breakpoint);

    actualValues = session.view(data.identifiers.native.current);
  });

  for (let [identifier, expected] of Object.entries(imitateRun())) {
    it(`correctly decodes ${identifier}`, function() {
      let actual = actualValues[identifier];

      assert.deepEqual(actual, expected);
    });
  }

});
