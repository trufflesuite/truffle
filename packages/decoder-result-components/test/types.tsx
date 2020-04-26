import { describe, it } from "mocha";
import * as React from "react";
import BN from "bn.js";
import ResultComponent from "../src/ResultComponent";
import { Format } from "@truffle/codec";
import { renderToString } from "react-dom/server";
import assert from "assert";
import ContractComponent from "../src/all";


describe("test", () => {
  it("tests", () => {
    const name = "name";
    const result = {
      type: {
        typeClass: "uint",
        bits: 123,
        typeHint: "hint",
      },
      kind: "value",
      value: {
        asBN: new BN(46574321),
        rawAsBN: new BN(46574321),
      }
    } as Format.Values.UintResult;
    const result2 = {
      type: {
        typeClass: "int",
        bits: 123,
        typeHint: "hint",
      },
      kind: "value",
      value: {
        asBN: new BN(-7894654),
        rawAsBN: new BN(-7894654),
      }
    } as Format.Values.IntResult;
    const arrayResult = {
      type: {
        typeClass: "array",
        kind: "static",
        baseType: {
          typeClass: "uint",
          bits: 123,
          typeHint: "hint"
        },
        length: new BN(3),
        location: "storage",
        typeHint: "hint"
      },
      kind: "value",
      reference: 123,
      value: [
        result,
        result2,
        result
      ]
    } as Format.Values.ArrayResult;

    const results = {
      someArray: arrayResult,
      aThing: result,
      anotherArray: arrayResult,
      prop: result2
    };

    // const instance = new UintComponent({name, result});
    const rendered = renderToString(<ContractComponent name={name} results={results} />);
    console.log(rendered);
    assert(true)
  });
})
