import debugModule from "debug";
const debug = debugModule("debugger:test:data:yul");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";

import * as Codec from "@truffle/codec";

const __YUL = `
pragma solidity ^0.8.0;

contract AssemblyTest {
  function run() public {
    uint outside = 8;
    assembly {
      let u := 3
      let v := u
      let w := add(u, 3)
      let z := outside
      let result := staticcall(gas(), 0, 0, 0, 0, 0) //identity fn
      if sgt(z, 0) {
        let k := shl(1, z)
        log1(0, 0, k) //BREAK #1
      }
      function twist(a, b) -> c, d {
        let x1, x2
        let y1, y2
        x1 := add(a, b)
        x2 := sub(a, b)
        y1 := and(a, b)
        y2 := or(a, b)
        c := mul(x1, x2)
        d := xor(y1, y2)
        log1(0, 0, sdiv(c, d)) //BREAK #2
      }
      let n, m := twist(w, v)
      log1(0, 0, shl(z, smod(n, m))) //BREAK #3
    }
  }
}
`;

let sources = {
  "AssemblyTest.sol": __YUL
};

describe("Assembly decoding", function () {
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

  it("Decodes assembly variables", async function () {
    this.timeout(12000);

    let instance = await abstractions.AssemblyTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
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
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );

    let expectedResult = {
      outside: 8,
      u: 3,
      v: 3,
      w: 6,
      z: 8,
      result: 1,
      k: 16
    };

    assert.deepInclude(variables, expectedResult);

    await bugger.continueUntilBreakpoint();

    variables = numberize(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );

    expectedResult = {
      a: 6,
      b: 3,
      x1: 9,
      x2: 3,
      y1: 2,
      y2: 7,
      c: 27,
      d: 5
    };

    assert.deepInclude(variables, expectedResult);

    await bugger.continueUntilBreakpoint();

    variables = numberize(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );

    expectedResult = {
      outside: 8,
      u: 3,
      v: 3,
      w: 6,
      z: 8,
      result: 1,
      n: 27,
      m: 5
    };

    assert.deepInclude(variables, expectedResult);
  });
});
