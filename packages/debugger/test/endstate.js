import debugModule from "debug";
const debug = debugModule("test:endstate"); // eslint-disable-line no-unused-vars

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import evm from "lib/evm/selectors";
import data from "lib/data/selectors";

import * as TruffleDecodeUtils from "truffle-decode-utils";

const __FAILURE = `
pragma solidity ~0.5;

contract FailureTest {
  function run() public {
    revert();
  }
}
`;

const __SUCCESS = `
pragma solidity ~0.5;

contract SuccessTest {
uint x;
  function run() public {
    x = 107;
  }
}
`;

let sources = {
  "FailureTest.sol": __FAILURE,
  "SuccessTest.sol": __SUCCESS
};

describe("End State", function() {
  var provider;

  var abstractions;
  var artifacts;
  var files;

  before("Create Provider", async function() {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
    files = prepared.files;
  });

  it("correctly marks a failed transaction as failed", async function() {
    let instance = await abstractions.FailureTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(); //this will throw because of the revert
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    assert.ok(!session.view(evm.transaction.status));
  });

  it("Gets vars at end of successful contract (and marks it successful)", async function() {
    let instance = await abstractions.SuccessTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    await session.continueUntilBreakpoint(); //no breakpoints set so advances to end

    debug("DCI %O", session.view(data.current.identifiers));
    debug("DCIR %O", session.view(data.current.identifiers.refs));
    debug("proc.assignments %O", session.view(data.proc.assignments));

    assert.ok(session.view(evm.transaction.status));
    const variables = TruffleDecodeUtils.Conversion.cleanBNs(
      await session.variables()
    );
    assert.include(variables, { x: 107 });
  });
});
