import debugModule from "debug";
const debug = debugModule("debugger:test:data:yul");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, lineOf, testBlockGasLimit } from "../helpers";
import Debugger from "lib/debugger";

import sourcemapping from "lib/sourcemapping/selectors";

import * as Codec from "@truffle/codec";

const __YUL = `
object "YulTest" {
  code {
    let size := datasize("runtime")
    datacopy(0, dataoffset("runtime"), size)
    return(0, size)
  }
  object "runtime" {
    code {
      let a := 1
      let b := 2 //BREAK #1
      mstore(0, add(b, a)) //BREAK #2
      return(0, 0x20)
    }
  }
}
`;

let sources = {
  "YulTest.yul": __YUL
};

describe("Assembly decoding (Yul source)", function () {
  let provider;
  let abstractions;
  let compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "debugger",
      miner: {
        instamine: "strict",
        blockGasLimit: testBlockGasLimit
      },
      logging: {
        quiet: true
      }
    });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Decodes variables in Yul files", async function () {
    this.timeout(12000);

    let instance = await abstractions.YulTest.deployed();
    let receipt = await instance.sendTransaction({});
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(sourcemapping.current.source).id;
    let source = bugger.view(sourcemapping.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK #1", source)
    });
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK #2", source)
    });
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK #3", source)
    });

    await bugger.continueUntilBreakpoint();

    const numberize = obj =>
      Object.assign(
        {},
        ...Object.entries(obj).map(([key, value]) => ({ [key]: Number(value) }))
      );

    let variables = numberize(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(
        await bugger.variables()
      )
    );

    let expectedResult = {
      a: 1
    };

    assert.deepEqual(variables, expectedResult);

    await bugger.continueUntilBreakpoint();

    variables = numberize(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(
        await bugger.variables()
      )
    );

    expectedResult = {
      a: 1,
      b: 2
    };

    assert.deepEqual(variables, expectedResult);
  });
});
