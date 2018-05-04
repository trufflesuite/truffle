import debugModule from "debug";
const debug = debugModule("test:data:decode");

import { assert } from "chai";
import Ganache from "ganache-cli";
import Web3 from "web3";
import util from "util";

import { prepareContracts } from "test/helpers";

import Debugger from "lib/debugger";

import { MAX_WORD, cleanBigNumbers } from "lib/data/decode/utils";

import data from "lib/data/selectors";
import evm from "lib/evm/selectors";

import {
  generateUints, solidityForFixtures, testCasesForFixtures
} from "./helpers";

const uints = generateUints();

function generateArray(length) {
  return [...Array(length)]
    .map(() => uints.next().value)
}

const TEST_NAME = "StorageVars";

const FIXTURES = [{
  name: "multipleFullWordArray",
  type: "uint[]",
  value: generateArray(3)  // takes up 3 whole words
}, {
  name: "withinWordArray",
  type: "uint16[]",
  value: generateArray(10)  // takes up >1/2 word
}, {
  name: "multiplePartWordArray",
  type: "uint64[]",
  value: generateArray(9)  // takes up 2.25 words
}, {
  name: "inconvenientlyWordOffsetArray",
  type: "uint240[]",
  value: generateArray(3)  // takes up ~2.8 words
}, {
  name: "shortString",
  type: "string",
  value: "hello world"
}, {
  name: "longString",
  type: "string",
  value: "solidity storage is a fun lesson in endianness"
}];

const SOURCE = solidityForFixtures(TEST_NAME, FIXTURES);

const sources = {
  [`${TEST_NAME}.sol`]: SOURCE
}

describe("Data Decoding", function() {
  this.timeout(30000);

  before("Create Provider", () => {
    this.provider = Ganache.provider({seed: "debugger", gasLimit: 7000000});
    this.web3 = new Web3(this.provider);
  });

  before("Prepare contracts and artifacts", async () => {
    let prepared = await prepareContracts(this.provider, sources)
    this.abstractions = prepared.abstractions;
    this.artifacts = prepared.artifacts;
    this.files = prepared.files;
  });

  before("Run transaction, save decoded variable values", async () => {
    let instance = await this.abstractions[TEST_NAME].deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider: this.provider,
      files: this.files,
      contracts: this.artifacts
    });

    let session = bugger.connect();
    var stepped;  // session steppers return false when done

    let breakpoint = {
      address: instance.address,
      line: SOURCE.split("\n").length - 4
    };

    session.continueUntil(breakpoint);

    this.definitions = session.view(data.current.identifiers.definitions);
    this.refs = session.view(data.current.identifiers.refs);
    let decode = session.view(data.views.decoder);
    this.decode = (...args) => cleanBigNumbers(decode(...args));

    debug("storage %O", session.view(evm.current.state.storage));
  });

  testCasesForFixtures.bind(this)(FIXTURES);
});
