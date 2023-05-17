import "jest-extended";
import { testProp } from "@fast-check/jest";
import * as Arbitrary from "./arbitrary";
import { FunctionEntry, EventEntry, ErrorEntry } from "./types";
import assert from "assert";

import * as Parse from "./parse";
import * as Signature from "./signature";

describe("Signature parsing (property-based tests)", () => {
  testProp(
    "abiSignature undoes parseFunctionSignature",
    [Arbitrary.FunctionEntry()],
    entry => {
      const correctSignature = Signature.abiSignature(entry as FunctionEntry); //sorry
      const reparsedEntry = Parse.parseFunctionSignature(correctSignature);
      const regeneratedSignature = Signature.abiSignature(reparsedEntry);
      assert.equal(regeneratedSignature, correctSignature);
    }
  );

  testProp(
    "abiSignature undoes parseErrorSignature",
    [Arbitrary.ErrorEntry()],
    entry => {
      const correctSignature = Signature.abiSignature(entry as ErrorEntry); //sorry
      const reparsedEntry = Parse.parseErrorSignature(correctSignature);
      const regeneratedSignature = Signature.abiSignature(reparsedEntry);
      assert.equal(regeneratedSignature, correctSignature);
    }
  );

  testProp(
    "abiSignature undoes parseEventSignature",
    [Arbitrary.EventEntry()],
    entry => {
      const correctSignature = Signature.abiSignature(entry as EventEntry); //sorry
      const reparsedEntry = Parse.parseEventSignature(correctSignature);
      const regeneratedSignature = Signature.abiSignature(reparsedEntry);
      assert.equal(regeneratedSignature, correctSignature);
    }
  );
});

describe("Signature parsing (manual tests)", () => {
  it("Parses simple signature", () => {
    const signature = "ThingsDone(uint256,bytes32,address)";
    const computed = Parse.parseEventSignature(signature);
    const expected: EventEntry = {
      type: "event",
      anonymous: false,
      name: "ThingsDone",
      inputs: [
        {
          name: "",
          indexed: false,
          type: "uint256"
        },
        {
          name: "",
          indexed: false,
          type: "bytes32"
        },
        {
          name: "",
          indexed: false,
          type: "address"
        }
      ]
    };
    assert.deepStrictEqual(computed, expected);
  });

  it("Parses signature with no inputs", () => {
    const signature = "ThingsNotDone()";
    const computed = Parse.parseErrorSignature(signature);
    const expected: ErrorEntry = {
      type: "error",
      name: "ThingsNotDone",
      inputs: []
    };
    assert.deepStrictEqual(computed, expected);
  });

  it("Parses signature with arrays", () => {
    const signature = "doThings(uint256[2],bytes32[4][4],string[])";
    const computed = Parse.parseFunctionSignature(signature);
    const expected: FunctionEntry = {
      type: "function",
      stateMutability: "nonpayable",
      outputs: [],
      name: "doThings",
      inputs: [
        {
          name: "",
          type: "uint256[2]"
        },
        {
          name: "",
          type: "bytes32[4][4]"
        },
        {
          name: "",
          type: "string[]"
        }
      ]
    };
    assert.deepStrictEqual(computed, expected);
  });

  it("Parses signature with tuples", () => {
    const signature =
      "doSillyThings((bool,address[]),(function,(string,bytes[2])))";
    const computed = Parse.parseFunctionSignature(signature);
    const expected: FunctionEntry = {
      type: "function",
      stateMutability: "nonpayable",
      outputs: [],
      name: "doSillyThings",
      inputs: [
        {
          name: "",
          type: "tuple",
          components: [
            {
              name: "",
              type: "bool"
            },
            {
              name: "",
              type: "address[]"
            }
          ]
        },
        {
          name: "",
          type: "tuple",
          components: [
            {
              name: "",
              type: "function"
            },
            {
              name: "",
              type: "tuple",
              components: [
                {
                  name: "",
                  type: "string"
                },
                {
                  name: "",
                  type: "bytes[2]"
                }
              ]
            }
          ]
        }
      ]
    };
    assert.deepStrictEqual(computed, expected);
  });

  it("Parses signature with arrays of tuples", () => {
    const signature =
      "doVerySillyThings((bool,address[])[2][][2],(string,int256)[][2][])";
    const computed = Parse.parseFunctionSignature(signature);
    const expected: FunctionEntry = {
      type: "function",
      stateMutability: "nonpayable",
      outputs: [],
      name: "doVerySillyThings",
      inputs: [
        {
          name: "",
          type: "tuple[2][][2]",
          components: [
            {
              name: "",
              type: "bool"
            },
            {
              name: "",
              type: "address[]"
            }
          ]
        },
        {
          name: "",
          type: "tuple[][2][]",
          components: [
            {
              name: "",
              type: "string"
            },
            {
              name: "",
              type: "int256"
            }
          ]
        }
      ]
    };
    assert.deepStrictEqual(computed, expected);
  });
});
