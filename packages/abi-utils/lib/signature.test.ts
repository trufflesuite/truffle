import * as Signature from "./signature";
import { FunctionEntry, EventEntry, ErrorEntry } from "./types";
import assert from "assert";

describe("signature computation", () => {
  it("computes simple signatures", () => {
    const entry: EventEntry = {
      type: "event",
      anonymous: false,
      name: "ThingsDone",
      inputs: [
        {
          name: "a",
          indexed: false,
          type: "uint256",
          internalType: "uint256"
        },
        {
          name: "b",
          indexed: false,
          type: "bytes32",
          internalType: "bytes32"
        },
        {
          name: "c",
          indexed: true,
          type: "address",
          internalType: "address payable"
        }
      ]
    };
    const expected = "ThingsDone(uint256,bytes32,address)";
    const signature = Signature.abiSignature(entry);
    assert.equal(signature, expected);
  });

  it("computes signatures with empty inputs", () => {
    const entry: ErrorEntry = {
      type: "error",
      name: "ThingsNotDone",
      inputs: []
    };
    const expected = "ThingsNotDone()";
    const signature = Signature.abiSignature(entry);
    assert.equal(signature, expected);
  });

  it("computes signatures with arrays", () => {
    const entry: FunctionEntry = {
      type: "function",
      stateMutability: "nonpayable",
      outputs: [],
      name: "doThings",
      inputs: [
        {
          name: "a",
          type: "uint256[2]",
          internalType: "uint256"
        },
        {
          name: "b",
          type: "bytes32[4][4]",
          internalType: "bytes32"
        },
        {
          name: "c",
          type: "string[]",
          internalType: "string[]"
        }
      ]
    };
    const expected = "doThings(uint256[2],bytes32[4][4],string[])";
    const signature = Signature.abiSignature(entry);
    assert.equal(signature, expected);
  });

  it("computes signatures with tuples", () => {
    const entry: FunctionEntry = {
      type: "function",
      stateMutability: "nonpayable",
      outputs: [],
      name: "doSillyThings",
      inputs: [
        {
          name: "a",
          type: "tuple",
          internalType: "struct Contract.Struct1",
          components: [
            {
              name: "aa",
              type: "bool",
              internalType: "bool"
            },
            {
              name: "ab",
              type: "address[]",
              internalType: "address payable[]"
            }
          ]
        },
        {
          name: "b",
          type: "tuple",
          internalType: "struct Contract.Struct2",
          components: [
            {
              name: "ba",
              type: "function",
              internalType:
                "function(bytes memory) external pure returns (bytes)"
            },
            {
              name: "ab",
              type: "tuple",
              internalType: "struct Contract.Struct3",
              components: [
                {
                  name: "aba",
                  type: "string",
                  internalType: "string"
                },
                {
                  name: "abb",
                  type: "bytes[2]",
                  internalType: "bytes[2]"
                }
              ]
            }
          ]
        }
      ]
    };
    const expected =
      "doSillyThings((bool,address[]),(function,(string,bytes[2])))";
    const signature = Signature.abiSignature(entry);
    assert.equal(signature, expected);
  });

  it("computes signatures with arrays of tuples", () => {
    const entry: FunctionEntry = {
      type: "function",
      stateMutability: "nonpayable",
      outputs: [],
      name: "doVerySillyThings",
      inputs: [
        {
          name: "a",
          type: "tuple[2][][2]",
          internalType: "struct Contract.Struct1",
          components: [
            {
              name: "aa",
              type: "bool",
              internalType: "bool"
            },
            {
              name: "ab",
              type: "address[]",
              internalType: "address payable[]"
            }
          ]
        },
        {
          name: "b",
          type: "tuple[][2][]",
          internalType: "struct Contract.Struct1",
          components: [
            {
              name: "ba",
              type: "string",
              internalType: "string"
            },
            {
              name: "bb",
              type: "int256",
              internalType: "address payable[]"
            }
          ]
        }
      ]
    };
    const expected =
      "doVerySillyThings((bool,address[])[2][][2],(string,int256)[][2][])";
    const signature = Signature.abiSignature(entry);
    assert.equal(signature, expected);
  });
});
