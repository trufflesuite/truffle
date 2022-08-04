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
import type { Web3BaseProvider as Provider } from "web3-common";

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
  describe("Structs and tuples", () => {
    let encoder: Encoder.ContractEncoder;
    let staticStructType: Codec.Format.Types.StructType;
    let dynamicStructType: Codec.Format.Types.StructType;

    beforeAll(async () => {
      encoder = await Encoder.forArtifact(artifacts.TestContract, {
        projectInfo: { compilations }
      });
      const userDefinedTypes = encoder
        .getProjectEncoder()
        .getUserDefinedTypes();
      staticStructType = <Codec.Format.Types.StructType>(
        Object.values(userDefinedTypes).find(
          type =>
            type.typeClass === "struct" &&
            type.typeName === "ByteAndNum" &&
            type.kind === "local" &&
            type.definingContractName === "TestContract"
        )
      );
      dynamicStructType = <Codec.Format.Types.StructType>(
        Object.values(userDefinedTypes).find(
          type =>
            type.typeClass === "struct" &&
            type.typeName === "NumAndString" &&
            type.kind === "local" &&
            type.definingContractName === "TestContract"
        )
      );
    });

    describe("Static structs/tuples", () => {
      let abi: Abi.FunctionEntry;
      let selector: string;

      beforeAll(() => {
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry =>
              entry.type === "function" && entry.name === "takesStaticStruct"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [["0xff", 1]]);
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("In loose mode, encodes objects (possibly with extra keys)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { x: "0xff", y: 1, garbage: "garbage" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes objects regardless of key order", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { garbage: "garbage", y: 1, x: "0xff" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes JSON arrays when enabled", async () => {
        const { data } = await encoder.encodeTxNoResolution(
          abi,
          ['["0xff", 1]'],
          { allowJson: true }
        );
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes JSON objects when enabled", async () => {
        const { data } = await encoder.encodeTxNoResolution(
          abi,
          ['{"x": "0xff", "y": 1}'],
          { allowJson: true }
        );
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes type/value pairs (struct)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          {
            type: "struct",
            value: { x: "0xff", y: 1 }
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes type/value pairs (tuple)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          {
            type: "tuple",
            value: { x: "0xff", y: 1 }
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes wrapped tuple values", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "tuple",
            memberTypes: [
              {
                name: "x",
                type: { typeClass: "bytes", kind: "static", length: 1 }
              },
              {
                name: "y",
                type: { typeClass: "uint", bits: 8 }
              }
            ]
          },
          { x: "0xff", y: 1, garbage: "garbage" }
        );
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes wrapped struct values", async () => {
        const wrapped = await encoder.wrap(staticStructType, {
          x: "0xff",
          y: 1,
          garbage: "garbage"
        });
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Rejects an array with a bad element", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [[255, 1]]);
          assert.fail("Array with bad element got encoded anyway");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects array of incorrect length (long)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [["0xff", 2, undefined]]);
          assert.fail("Overlong array got encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects array of incorrect length (short)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [["0xff"]]);
          assert.fail("Short array got encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects object with missing keys", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ x: "0xff" }]);
          assert.fail("Missing key should cause error");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects object with bad values", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ x: 255, y: 1 }]);
          assert.fail("Error in element should cause error");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects JSON when not enabled", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ['{"x": "0xff", "y": 1 }']);
          assert.fail("JSON should be rejected unless explicitly enabled");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects invalid JSON", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ['{"x": "0xff", "y": 1'], {
            allowJson: true
          });
          assert.fail("Invalid JSON should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects array JSON that doesn't match", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ['["0xff", 1, 107]'], {
            allowJson: true
          });
          assert.fail("JSON of wrong length got encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects object JSON that doesn't match", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ['{"z": 107, "w": 683}'], {
            allowJson: true
          });
          assert.fail("JSON with wrong keys got encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: null)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [null]);
          assert.fail("Null should not be encoded as a struct");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: undefined)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a struct");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair with wrong type", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            { type: "array", value: ["0xff", "1"] }
          ]);
          assert.fail("Value specified as array got encoded as struct");
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
              type: "tuple",
              value: {
                type: "tuple",
                value: ["0xff", "1"]
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

      it("Rejects wrapped value for wrong type (array)", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "array",
            kind: "dynamic",
            baseType: { typeClass: "uint", bits: 8 }
          },
          [1, 2]
        );
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Value wrapped as array got encoded as struct");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped value for wrong type (wrong struct)", async () => {
        const wrapped = await encoder.wrap(dynamicStructType, {
          x: 1,
          y: "ABC"
        });
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Value wrapped as array got encoded as struct");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped error result", async () => {
        const wrapped = {
          type: staticStructType,
          kind: "error",
          error: {
            kind: "ReadErrorStack",
            from: 0,
            to: 0
          }
        };
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Error result got encoded as struct");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });

    describe("Dynamic structs/tuples", () => {
      let abi: Abi.FunctionEntry;
      let selector: string;

      beforeAll(() => {
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesStruct"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          ["1", "ABC"]
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes objects", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { x: "1", y: "ABC" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes objects regardless of key order", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { y: "ABC", x: 1 }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes type/value pairs (struct)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          {
            type: "struct",
            value: { x: 1, y: "ABC" }
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes type/value pairs (tuple)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          {
            type: "tuple",
            value: { x: 1, y: "ABC" }
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes wrapped tuple values", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "tuple",
            memberTypes: [
              {
                name: "x",
                type: { typeClass: "uint", bits: 8 }
              },
              {
                name: "y",
                type: { typeClass: "string" }
              }
            ]
          },
          { x: 1, y: "ABC" }
        );
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes wrapped struct values", async () => {
        const wrapped = await encoder.wrap(dynamicStructType, {
          x: 1,
          y: "ABC"
        });
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });
    });
  });
});
