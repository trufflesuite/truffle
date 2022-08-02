import debugModule from "debug";
const debug = debugModule("encoder:test");

import { assert } from "chai";
import path from "path";
import fs from "fs-extra";

import * as Encoder from "..";
import * as Codec from "@truffle/codec";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import * as Abi from "@truffle/abi-utils";
import Ganache from "ganache";
import type { Provider } from "web3/providers";

import BN from "bn.js";

import { prepareContracts } from "./helpers";

let artifacts: { [name: string]: Artifact };
let compilations: Codec.Compilations.Compilation[];
const addresses: { [name: string]: string } = {
  "locate.gold": "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
};

beforeAll(async () => {
  //prepare contracts and artifacts

  // need to ts-ignore due to a strict-null-checks issue in Ganache
  // (https://github.com/trufflesuite/ganache/issues/2125)
  // remove this ts-ignore once that issue is fixed
  // @ts-ignore
  const provider: Provider = Ganache.provider({
    seed: "encoder",
    gasLimit: 7000000,
    logging: {
      quiet: true
    },
    miner: {
      //note: we should ideally set strict here, but that causes a test
      //failure in the ENS testing; we should figure out what's up with
      //that so we can set strict
      instamine: "eager"
    }
  });

  const sourceNames = ["EncoderTests.sol", "DecimalTest.vy"];

  let sources: { [name: string]: string } = {};

  for (const name of sourceNames) {
    const sourcePath = path.join(__dirname, name);
    sources[sourcePath] = await fs.readFile(sourcePath, "utf8");
  }

  ({ artifacts, compilations } = await prepareContracts(
    sources,
    addresses,
    provider
  ));
}, 50000);

describe("Encoding", () => {
  describe("Arrays", () => {
    let encoder: Encoder.ContractEncoder;

    beforeAll(async () => {
      encoder = await Encoder.forArtifact(artifacts.TestContract, {
        projectInfo: { compilations }
      });
    });

    describe("Static-length", () => {
      let abi: Abi.FunctionEntry;
      let selector: string;

      beforeAll(() => {
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry =>
              entry.type === "function" && entry.name === "takesStaticArray"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [[1, 2]]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes arrays with mixed representations", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [[1, "2"]]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes JSON when enabled", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, ['[1, "2"]'], {
          allowJson: true
        });
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes type/value pairs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          {
            type: "array",
            value: [1, 2]
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes type/value pairs with type on element", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          {
            type: "array",
            value: [{ type: "uint8", value: 1 }, 2]
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes wrapped array values (static-length)", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "array",
            kind: "static",
            length: new BN(2),
            baseType: {
              typeClass: "uint",
              bits: 8
            }
          },
          [1, 2]
        );
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes wrapped array values (dynamic-length)", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "array",
            kind: "dynamic",
            baseType: {
              typeClass: "uint",
              bits: 8
            }
          },
          [1, 2]
        );
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Rejects an array with a bad element", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [[1, 2.5]]);
          assert.fail("Array with bad element got encoded anyway");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects array of incorrect length (long)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [[1, 2, 3]]);
          assert.fail("Overlong array got encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects array of incorrect length (short)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [[1]]);
          assert.fail("Short array got encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects JSON when not enabled", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["[1,2]"]);
          assert.fail("JSON should not be accepted unless explicitly enabled");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects invalid JSON", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["[1,2"], {
            allowJson: true
          });
          assert.fail("Bad JSON was accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects JSON that doesn't match", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["[1,2,3]"], {
            allowJson: true
          });
          assert.fail("JSON of wrong length was accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: null)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [null]);
          assert.fail("Null should not be encoded as an array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: undefined)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [undefined]);
          assert.fail("Undefined should not be encoded as an array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: {})", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{}]);
          assert.fail("Empty object should not be encoded as an array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects array with element of wrong specified type", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            [{ type: "uint256", value: 1 }, 2]
          ]);
          assert.fail(
            "Array element specified as uint256 got encoded as uint8"
          );
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair with wrong type", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            { type: "tuple", value: [1, 2] }
          ]);
          assert.fail("Value specified as tuple got encoded as array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects nested type/value pair", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            {
              type: "array",
              value: {
                type: "array",
                value: [1, 2]
              }
            }
          ]);
          assert.fail("Nested type/value pair got encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped value for wrong type", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "tuple",
            memberTypes: [
              { type: { typeClass: "uint", bits: 8 } },
              { type: { typeClass: "uint", bits: 8 } }
            ]
          },
          [1, 2]
        );
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Value wrapped as tuple got encoded as array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped error result", async () => {
        const wrapped = {
          type: {
            typeClass: "array",
            kind: "static",
            length: new BN(2),
            baseType: { typeClass: "uint", bits: 8 }
          },
          kind: "error",
          error: {
            kind: "ReadErrorStack",
            from: 0,
            to: 0
          }
        };
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Error result got encoded as array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });

    describe("Dynamic-length", () => {
      let abi: Abi.FunctionEntry;
      let selector: string;

      beforeAll(() => {
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesArray"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [[1, 2]]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes arrays with mixed representations", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [[1, "2"]]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes type/value pairs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          {
            type: "array",
            value: [1, 2]
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes type/value pairs with type on element", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          {
            type: "array",
            value: [{ type: "uint8", value: 1 }, 2]
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes wrapped array values (dynamic-length)", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "array",
            kind: "dynamic",
            baseType: {
              typeClass: "uint",
              bits: 8
            }
          },
          [1, 2]
        );
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes wrapped array values (static-length)", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "array",
            kind: "static",
            length: new BN(2),
            baseType: {
              typeClass: "uint",
              bits: 8
            }
          },
          [1, 2]
        );
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Rejects an array with a bad element", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [[1, 2.5]]);
          assert.fail("Array with bad element got encoded anyway");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: null)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [null]);
          assert.fail("Null should not be encoded as an array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: undefined)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [undefined]);
          assert.fail("Undefined should not be encoded as an array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: {})", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{}]);
          assert.fail("Empty object should not be encoded as an array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects array with element of wrong specified type", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            [{ type: "uint256", value: 1 }, 2]
          ]);
          assert.fail(
            "Array element specified as uint256 got encoded as uint8"
          );
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair with wrong type", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            { type: "tuple", value: [1, 2] }
          ]);
          assert.fail("Value specified as tuple got encoded as array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects nested type/value pair", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            {
              type: "array",
              value: {
                type: "array",
                value: [1, 2]
              }
            }
          ]);
          assert.fail("Nested type/value pair got encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped value for wrong type", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "tuple",
            memberTypes: [
              { type: { typeClass: "uint", bits: 8 } },
              { type: { typeClass: "uint", bits: 8 } }
            ]
          },
          [1, 2]
        );
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Value wrapped as tuple got encoded as array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped error result", async () => {
        const wrapped = {
          type: {
            typeClass: "array",
            kind: "static",
            length: new BN(2),
            baseType: { typeClass: "uint", bits: 8 }
          },
          kind: "error",
          error: {
            kind: "ReadErrorStack",
            from: 0,
            to: 0
          }
        };
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Error result got encoded as array");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });
  });
});
