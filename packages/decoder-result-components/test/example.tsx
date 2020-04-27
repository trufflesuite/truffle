import assert from "assert";
import BN from "bn.js";
import { describe, it } from "mocha";
import * as React from "react";
import { renderToString } from "react-dom/server";
import TestRenderer from 'react-test-renderer';

import { Format } from "@truffle/codec";

import { Result, ValueKind, Type, Value } from "../src/contexts";


const UINT_RESULT: Format.Values.UintResult = {
  type: {
    typeClass: "uint",
    bits: 256,
  },
  kind: "value",
  value: {
    asBN: new BN(46574321)
  }
};


describe("example usage", () => {
  it("renders typeClass", () => {
    const component = <Result result={UINT_RESULT} />;

    const testRenderer = TestRenderer.create(component);
    const testInstance = testRenderer.root;

    assert(testInstance.findByProps({ children: "uint256" }));
  });

  it("allows custom display", () => {
    const component = (
      <Result result={UINT_RESULT}>
        <ValueKind>
          <Type />: <Value />
        </ValueKind>
      </Result>
    );

    const testRenderer = TestRenderer.create(component);
    const rendered = renderToString(component);
    console.debug("rendered %o", rendered);
  });

  it("allows override to hide typeclass", () => {
    const component = (
      <Result result={UINT_RESULT}>
        hi
      </Result>
    );

    const testRenderer = TestRenderer.create(component);
    const testInstance = testRenderer.root;

    assert.throws(() => testInstance.findByProps({ children: "uint256" }));
  });

  /* it("allows zero-config usage", () => { */
  /*   const result = { */
  /*     type: { */
  /*       typeClass: "uint", */
  /*       bits: 123, */
  /*       typeHint: "hint", */
  /*     }, */
  /*     kind: "value", */
  /*     value: { */
  /*       asBN: new BN(46574321), */
  /*       rawAsBN: new BN(46574321), */
  /*     } */
  /*   } as Format.Values.UintResult; */

  /*   const component = */
  /*     <ResultComponent */
  /*       name={"result"} */
  /*       result={result} />; */

  /*   const rendered = TestRenderer.create(component).toJSON(); */
  /* }); */

  /* it("allows custom components", () => { */
  /*   const result = { */
  /*     type: { */
  /*       typeClass: "uint", */
  /*       bits: 123, */
  /*       typeHint: "hint", */
  /*     }, */
  /*     kind: "value", */
  /*     value: { */
  /*       asBN: new BN(46574321), */
  /*       rawAsBN: new BN(46574321), */
  /*     } */
  /*   } as Format.Values.UintResult; */

  /*   const component = */
/* <ResultComponent result={result}> */
  /* <Override> */
  /*   <ElementaryResult> */
  /*     <ErrorKind> */
  /*       <Error /> */
  /*     </ErrorKind> */

  /*     <ValueKind> */
  /*       <Value /> (<Type />) */
  /*     </ValueKind> */
  /*   </ElementaryResult> */

  /*   <StructResult> */
  /*     <StructItem> */
  /*       <Override> */
  /*         <ElementaryResult> */
  /*           <ErrorKind> */
  /*             <Name />: <Error /> */
  /*           </ErrorKind> */

  /*           <ValueKind> */
  /*             <Name />: <Value /> (<Type />) */
  /*           </ValueKind> */
  /*         </ElementaryResult> */
  /*       </Override> */
  /*     </StructItem> */
  /*   </StructResult> */
  /* </Override> */
/* </ResultComponent>; */
  /* }); */


});
