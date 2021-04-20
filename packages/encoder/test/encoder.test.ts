import debugModule from "debug";
const debug = debugModule("encoder:test");

import { assert } from "chai";
import path from "path";
import fs from "fs-extra";

import * as Encoder from "..";
import * as Codec from "@truffle/codec";
import { Shims } from "@truffle/compile-common";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import type TruffleConfig from "@truffle/config";
import * as Abi from "@truffle/abi-utils";
const Ganache = require("ganache-core"); //sorry for untyped import
import type { Provider } from "web3/providers";

import BN from "bn.js";
import BigNumber from "bignumber.js";
import Big from "big.js";
import {
  BigNumber as EthersBigNumber,
  FixedNumber
} from "@ethersproject/bignumber";

import { prepareContracts } from "./helpers";

//deepEqual doesn't seem to work for BNs here, so we'll do this
//manually instead :-/
function checkEqTx(
  result: { [name: string]: any },
  expected: { [name: string]: any }
): void {
  assert.hasAllKeys(result, expected);
  for (const [key, value] of Object.entries(result)) {
    if (BN.isBN(expected[key])) {
      assert(BN.isBN(value));
      assert(value.eq(expected[key]));
    } else {
      assert.deepEqual(value, expected[key]);
    }
  }
}

describe("Wrapping, encoding, and overload resolution", () => {
  let artifacts: { [name: string]: Artifact };
  let compilations: Codec.Compilations.Compilation[];
  let config: TruffleConfig;
  let registryAddress: string;
  const addresses: { [name: string]: string } = {
    "locate.gold": "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
  };

  beforeAll(async () => {
    //prepare contracts and artifacts

    const provider: Provider = Ganache.provider({
      seed: "encoder",
      gasLimit: 7000000
    });

    const sourceNames = ["EncoderTests.sol", "DecimalTest.vy"];

    let sources: { [name: string]: string } = {};

    for (const name of sourceNames) {
      const sourcePath = path.join(__dirname, name);
      sources[sourcePath] = await fs.readFile(sourcePath, "utf8");
    }

    ({
      artifacts,
      compilations,
      config,
      registryAddress
    } = await prepareContracts(sources, addresses, provider));
  }, 50000);

  describe("Encoding", () => {
    describe("Strings", () => {
      let encoder: Encoder.ContractEncoder;
      let abi: Abi.FunctionEntry;
      let selector: string;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations }
        });
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesString"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes strings", async () => {
        const { data } = await encoder.encodeTransaction(abi, ["ABC"]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed strings", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          new String("ABC")
        ]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes wrapped strings", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "string" },
          "ABC"
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes wrapped strings with invalid UTF-8", async () => {
        const wrapped = {
          type: { typeClass: "string" },
          kind: "value",
          value: {
            kind: "malformed",
            asHex: "0xa1a1a1"
          }
        };
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003a1a1a10000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes type/value pair", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          { type: "string", value: "ABC" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Rejects strings with bad UTF-16", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            ["\udc00"] //individual low surrogate
          );
          assert.fail("Bad UTF-16 should cause an exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-string things (test: null)", async () => {
        try {
          await encoder.encodeTransaction(abi, [null]);
          assert.fail("Null should not be encoded as a string");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-string things (test: undefined)", async () => {
        try {
          await encoder.encodeTransaction(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a string");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-string things (test: {})", async () => {
        try {
          await encoder.encodeTransaction(abi, [{}]);
          assert.fail("Empty object should not be encoded as a string");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type", async () => {
        try {
          await encoder.encodeTransaction(abi, [{ type: "uint", value: "1" }]);
          assert.fail("Value specified as uint got encoded as string");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped value for wrong type", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "uint", bits: 256 },
          "1"
        );
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Value wrapped as uint got encoded as string");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped error result", async () => {
        const wrapped = {
          type: { typeClass: "string" },
          kind: "error",
          error: {
            kind: "ReadErrorStack",
            from: 0,
            to: 0
          }
        };
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Error result got encoded as string");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });

    describe("Bytestrings", () => {
      let encoder: Encoder.ContractEncoder;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations }
        });
      });

      describe("Dynamic-length", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry => entry.type === "function" && entry.name === "takesBytes"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
        });

        it("Encodes hex strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, ["0xDeAdBeEf"]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes hex strings (0X)", async () => {
          const { data } = await encoder.encodeTransaction(abi, ["0XDeAdBeEf"]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes boxed hex strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new String("0xDeAdBeEf")
          ]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes type/value pair", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "bytes", value: "0xDeAdBeEf" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes Uint8Arrays", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Uint8Array([0, 1, 255])
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000030001ff0000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes Uint8Array-likes", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { length: 3, 0: 0, 1: 1, 2: 255, garbage: "garbage" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000030001ff0000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes text as UTF-8", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { text: "ABC", encoding: "utf8" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes wrapped bytestrings", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "bytes", kind: "dynamic" },
            "0xdeadbeef"
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes wrapped bytestrings (static length)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "bytes", kind: "static", length: 4 },
            "0xdeadbeef"
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Rejects odd-length hex strings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0xa"]);
            assert.fail("Odd-length hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects hex strings without 0x prefix", async () => {
          try {
            await encoder.encodeTransaction(abi, ["01"]);
            assert.fail("Unprefixed hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other strings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["abc"]);
            assert.fail("Non-hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-utf8 encodings", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { text: "ABC", encoding: "latin1" }
            ]);
            assert.fail("Non-utf8 encodings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects bytes above 255", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 256 }]);
            assert.fail("Accepted byte above 255");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: -1 }]);
            assert.fail("Accepted negative byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 0.5 }]);
            assert.fail("Accepted fractional byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: "garbage" }]);
            assert.fail("Accepted non-numeric byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 0.5 }]);
            assert.fail("Accepted fractional length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: -1 }]);
            assert.fail("Accepted negative length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects unsafely large length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1e100 }]);
            assert.fail("Accepted unsafely large length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: "garbage" }]);
            assert.fail("Accepted non-numeric length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (string)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "string", value: "ABC" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (bytes32)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "bytes32", value: "0xDeAdBeEf" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytesring things (test: null)", async () => {
          try {
            await encoder.encodeTransaction(abi, [null]);
            assert.fail("Null should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytestring things (test: undefined)", async () => {
          try {
            await encoder.encodeTransaction(abi, [undefined]);
            assert.fail("Undefined should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytestring things (test: {})", async () => {
          try {
            await encoder.encodeTransaction(abi, [{}]);
            assert.fail("Empty object should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects wrapped value for wrong type", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "uint", bits: 256 },
            "1"
          );
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Value wrapped as uint got encoded as bytes");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects wrapped error result", async () => {
          const wrapped = {
            type: { typeClass: "bytes", kind: "dynamic" },
            kind: "error",
            error: {
              kind: "ReadErrorStack",
              from: 0,
              to: 0
            }
          };
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Error result got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });

      describe("Static-length (long)", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry =>
                entry.type === "function" && entry.name === "takesBytes32"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
        });

        it("Encodes hex strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, ["0xDeAdBeEf"]);
          assert.strictEqual(
            data,
            selector +
              "deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes boxed hex strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new String("0xDeAdBeEf")
          ]);
          assert.strictEqual(
            data,
            selector +
              "deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes type/value pair", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "bytes32", value: "0xDeAdBeEf" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes Uint8Arrays", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Uint8Array([0, 1, 255])
          ]);
          assert.strictEqual(
            data,
            selector +
              "0001ff0000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes Uint8Array-likes", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { length: 3, 0: 0, 1: 1, 2: 255, garbage: "garbage" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0001ff0000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes text as UTF-8", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { text: "ABC", encoding: "utf8" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "4142430000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes wrapped bytestrings (static length)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "bytes", kind: "static", length: 4 },
            "0xdeadbeef"
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes wrapped bytestrings (dynamic length)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "bytes", kind: "dynamic" },
            "0xdeadbeef"
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "deadbeef00000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Rejects odd-length hex strings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0xa"]);
            assert.fail("Odd-length hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects hex strings without 0x prefix", async () => {
          try {
            await encoder.encodeTransaction(abi, ["01"]);
            assert.fail("Unprefixed hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects overlong bytestrings", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef00"
            ]);
            assert.fail("Overlong bytesrings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other strings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["abc"]);
            assert.fail("Non-hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-utf8 encodings", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { text: "ABC", encoding: "latin1" }
            ]);
            assert.fail("Non-utf8 encodings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects bytes above 255", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 256 }]);
            assert.fail("Accepted byte above 255");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: -1 }]);
            assert.fail("Accepted negative byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 0.5 }]);
            assert.fail("Accepted fractional byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: "garbage" }]);
            assert.fail("Accepted non-numeric byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 0.5 }]);
            assert.fail("Accepted fractional length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: -1 }]);
            assert.fail("Accepted negative length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: "garbage" }]);
            assert.fail("Accepted non-numeric length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (string)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "string", value: "ABC" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (bytes)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "bytes", value: "0xDeAdBeEf" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (bytes1)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "bytes1", value: "0xDeAdBeEf" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (byte)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "byte", value: "0xDeAdBeEf" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytesring things (test: null)", async () => {
          try {
            await encoder.encodeTransaction(abi, [null]);
            assert.fail("Null should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytestring things (test: undefined)", async () => {
          try {
            await encoder.encodeTransaction(abi, [undefined]);
            assert.fail("Undefined should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytestring things (test: {})", async () => {
          try {
            await encoder.encodeTransaction(abi, [{}]);
            assert.fail("Empty object should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects wrapped value for wrong type", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "uint", bits: 256 },
            "1"
          );
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Value wrapped as uint got encoded as bytes");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects wrapped error result", async () => {
          const wrapped = {
            type: { typeClass: "bytes", kind: "static", length: 32 },
            kind: "error",
            error: {
              kind: "ReadErrorStack",
              from: 0,
              to: 0
            }
          };
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Error result got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });

      describe("Static-length (short)", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry => entry.type === "function" && entry.name === "takesBytes1"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
        });

        it("Encodes hex strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, ["0xFf"]);
          assert.strictEqual(
            data,
            selector +
              "ff00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes boxed hex strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new String("0xFf")
          ]);
          assert.strictEqual(
            data,
            selector +
              "ff00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes type/value pair", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "byte", value: "0xFf" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "ff00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes Uint8Arrays", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Uint8Array([255])
          ]);
          assert.strictEqual(
            data,
            selector +
              "ff00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes Uint8Array-likes", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { length: 1, 0: 255, garbage: "garbage" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "ff00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes text as UTF-8", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { text: "A", encoding: "utf8" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "4100000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes wrapped bytestrings (static length)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "bytes", kind: "static", length: 1 },
            "0xff"
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "ff00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes wrapped bytestrings (dynamic length)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "bytes", kind: "dynamic" },
            "0xff"
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "ff00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Rejects odd-length hex strings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0xa"]);
            assert.fail("Odd-length hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects hex strings without 0x prefix", async () => {
          try {
            await encoder.encodeTransaction(abi, ["01"]);
            assert.fail("Unprefixed hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects overlong bytestrings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0xffff"]);
            assert.fail("Overlong bytesrings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other strings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["a"]);
            assert.fail("Non-hex strings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-utf8 encodings", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { text: "A", encoding: "latin1" }
            ]);
            assert.fail("Non-utf8 encodings should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects bytes above 255", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 256 }]);
            assert.fail("Accepted byte above 255");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: -1 }]);
            assert.fail("Accepted negative byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 0.5 }]);
            assert.fail("Accepted fractional byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: "garbage" }]);
            assert.fail("Accepted non-numeric byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 0.5 }]);
            assert.fail("Accepted fractional length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: -1 }]);
            assert.fail("Accepted negative length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: "garbage" }]);
            assert.fail("Accepted non-numeric length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (string)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "string", value: "ABC" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (bytes)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "bytes", value: "0xDeAdBeEf" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (bytes32)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "bytes32", value: "0xDeAdBeEf" }
            ]);
            assert.fail("Accepted type/value pair for wrong type");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytesring things (test: null)", async () => {
          try {
            await encoder.encodeTransaction(abi, [null]);
            assert.fail("Null should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytestring things (test: undefined)", async () => {
          try {
            await encoder.encodeTransaction(abi, [undefined]);
            assert.fail("Undefined should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-bytestring things (test: {})", async () => {
          try {
            await encoder.encodeTransaction(abi, [{}]);
            assert.fail("Empty object should not be encoded as a bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects wrapped value for wrong type", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "uint", bits: 256 },
            "1"
          );
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Value wrapped as uint got encoded as bytes");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects wrapped error result", async () => {
          const wrapped = {
            type: { typeClass: "bytes", kind: "static", length: 1 },
            kind: "error",
            error: {
              kind: "ReadErrorStack",
              from: 0,
              to: 0
            }
          };
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Error result got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });
    });

    describe("Booleans", () => {
      let encoder: Encoder.ContractEncoder;
      let abi: Abi.FunctionEntry;
      let selector: string;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations }
        });
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesBool"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes booleans (true)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [true]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes booleans (false)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [false]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed booleans", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          new Boolean(false)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes general strings as true", async () => {
        const { data } = await encoder.encodeTransaction(abi, ["blorb"]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes empty strings as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [""]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes variations of 'false' as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, ["FaLsE"]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed empty strings as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [new String("")]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed variations of 'false' as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          new String("FaLsE")
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes general numbers as true", async () => {
        const { data } = await encoder.encodeTransaction(abi, [3]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes 0 as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [0]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes NaN as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [NaN]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed 0 as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [new Number(0)]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed NaN as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          new Number(NaN)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes null as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [null]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes undefined as false", async () => {
        const { data } = await encoder.encodeTransaction(abi, [undefined]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes {} as true", async () => {
        const { data } = await encoder.encodeTransaction(abi, [{}]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes [] as true", async () => {
        const { data } = await encoder.encodeTransaction(abi, [[]]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes type/value pair", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          { type: "bool", value: false }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes wrapped bools", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "bool" },
          false
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes out-of-range errors to true", async () => {
        const wrapped = {
          type: { typeClass: "bool" },
          kind: "error",
          error: {
            kind: "BoolOutOfRangeError",
            rawAsBN: new BN(2)
          }
        };
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes padding errors to true", async () => {
        const wrapped = {
          type: { typeClass: "bool" },
          kind: "error",
          error: {
            kind: "BoolPaddingError",
            raw:
              "0x0000000000000000000000000000000000000000000000000000000000000100",
            paddingType: "left"
          }
        };
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Rejects type/value pair for wrong type", async () => {
        try {
          await encoder.encodeTransaction(abi, [{ type: "uint", value: "1" }]);
          assert.fail("Value specified as uint got encoded as bool");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped value for wrong type", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "uint", bits: 256 },
          "1"
        );
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Value wrapped as uint got encoded as bool");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects general wrapped error result", async () => {
        const wrapped = {
          type: { typeClass: "bool" },
          kind: "error",
          error: {
            kind: "ReadErrorStack",
            from: 0,
            to: 0
          }
        };
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Error result (of general sort) got encoded as bool");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });

    describe("Decimals", () => {
      //note: this one uses the Vyper contract!
      let encoder: Encoder.ContractEncoder;
      let abi: Abi.FunctionEntry;
      let selector: string;
      let enumType: Codec.Format.Types.EnumType;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.DecimalTest, {
          projectInfo: { compilations }
        });
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.DecimalTest.abi).find(
            entry => entry.type === "function" && entry.name === "takesDecimal"
          )
        );
        //decimal = fixed168x10
        //10^10 = 0x2540be400
        //negates to 0xf..fdabf41c00
        //10^9 = 0x3b9aca00
        //negates to 0xf..fc4653600
        selector = Codec.AbiData.Utils.abiSelector(abi);
        const userDefinedTypes = encoder
          .getProjectEncoder()
          .getUserDefinedTypes();
        enumType = <Codec.Format.Types.EnumType>(
          Object.values(userDefinedTypes).find(
            type =>
              type.typeClass === "enum" &&
              type.typeName === "Color" &&
              type.kind === "local" &&
              type.definingContractName === "TestContract"
          )
        );
      });

      it("Encodes numbers", async () => {
        const { data } = await encoder.encodeTransaction(abi, [0.1]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes negative numbers", async () => {
        const { data } = await encoder.encodeTransaction(abi, [-0.1]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
        );
      });

      it("Encodes boxed numbers", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          new Number(0.1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes bigints", async () => {
        const { data } = await encoder.encodeTransaction(abi, [BigInt(1)]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000002540be400"
        );
      });

      it("Encodes negative bigints", async () => {
        const { data } = await encoder.encodeTransaction(abi, [BigInt(-1)]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffdabf41c00"
        );
      });

      it("Encodes BNs", async () => {
        const { data } = await encoder.encodeTransaction(abi, [new BN(1)]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000002540be400"
        );
      });

      it("Encodes negative BNs", async () => {
        const { data } = await encoder.encodeTransaction(abi, [new BN(-1)]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffdabf41c00"
        );
      });

      it("Encodes Bigs", async () => {
        const { data } = await encoder.encodeTransaction(abi, [new Big(".1")]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes negative Bigs", async () => {
        const { data } = await encoder.encodeTransaction(abi, [new Big("-.1")]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
        );
      });

      it("Encodes BigNumbers (MikeMcl)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          new BigNumber(".1")
        ]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes negative BigNumbers (MikeMcl)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          new BigNumber("-.1")
        ]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
        );
      });

      it("Encodes BigNumbers (ethers)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          EthersBigNumber.from(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000002540be400"
        );
      });

      it("Encodes negative BigNumbers (ethers)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          EthersBigNumber.from(-1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffdabf41c00"
        );
      });

      it("Encodes FixedNumbers", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          FixedNumber.from(".1")
        ]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes negative FixedNumbers", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          FixedNumber.from("-.1")
        ]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
        );
      });

      it("Encodes numeric strings", async () => {
        const { data } = await encoder.encodeTransaction(abi, [" -.1 "]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
        );
      });

      it("Encodes scientific notation", async () => {
        const { data } = await encoder.encodeTransaction(abi, [" -1e-1 "]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
        );
      });

      it("Encodes boxed numeric strings", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          new String(" -.1 ")
        ]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
        );
      });

      it("Encodes type/value pairs", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          { type: "fixed168x10", value: ".1" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes wrapped fixed-point values (signed)", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "fixed", bits: 168, places: 10 },
          "0.1"
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes wrapped fixed-point values (unsigned)", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "ufixed", bits: 168, places: 10 },
          "0.1"
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes wrapped integer values (signed)", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "int", bits: 168 },
          1
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000002540be400"
        );
      });

      it("Encodes wrapped integer values (unsigned)", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "uint", bits: 168 },
          1
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000002540be400"
        );
      });

      it("Encodes wrapped enum values", async () => {
        const wrapped = await encoder.wrapElementaryValue(enumType, 1);
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000002540be400"
        );
      });

      it("Encodes enum out-of-range errors", async () => {
        const wrapped = {
          type: enumType,
          kind: "error",
          error: {
            kind: "EnumOutOfRangeError",
            type: enumType,
            rawAsBN: new BN(16)
          }
        };
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000002540be4000"
        );
      });

      it("Rejects out-of-range input (string, positive)", async () => {
        try {
          await encoder.encodeTransaction(abi, ["1e41"]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (string, negative)", async () => {
        try {
          await encoder.encodeTransaction(abi, ["-1e41"]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (bigint, positive)", async () => {
        try {
          await encoder.encodeTransaction(abi, [BigInt(10) ** BigInt(41)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (bigint, negative)", async () => {
        try {
          await encoder.encodeTransaction(abi, [-(BigInt(10) ** BigInt(41))]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BN, positive)", async () => {
        try {
          await encoder.encodeTransaction(abi, [new BN(10).pow(new BN(41))]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BN, negative)", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            new BN(10).pow(new BN(41)).neg()
          ]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Big, positive)", async () => {
        try {
          await encoder.encodeTransaction(abi, [new Big("1e41")]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Big, negative)", async () => {
        try {
          await encoder.encodeTransaction(abi, [new Big("-1e41")]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BigNumber, positive)", async () => {
        try {
          await encoder.encodeTransaction(abi, [new BigNumber("1e41")]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BigNumber, negative)", async () => {
        try {
          await encoder.encodeTransaction(abi, [new BigNumber("-1e41")]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers BigNumber, positive)", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            EthersBigNumber.from(10).pow(41)
          ]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers BigNumber, negative)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [EthersBigNumber.from(-10).pow(41)] //most convenient way I could find... (41 is odd)
          );
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers FixedNumber, positive)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [FixedNumber.from("100000000000000000000000000000000000000000")] //I can't find a better way than this...
          );
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers FixedNumber, negative)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [FixedNumber.from("-100000000000000000000000000000000000000000")] //I can't find a better way than this...
          );
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input for unsigned type (too big)", async () => {
        try {
          await encoder.wrapElementaryValue(
            { typeClass: "ufixed", bits: 168, places: 10 },
            "1e41"
          );
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input for unsigned type", async () => {
        try {
          await encoder.wrapElementaryValue(
            { typeClass: "ufixed", bits: 168, places: 10 },
            -1
          );
          assert.fail(
            "Negative input for unsigned type should cause exception"
          );
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-finite input (number)", async () => {
        try {
          await encoder.encodeTransaction(abi, [NaN]);
          assert.fail("Non-finite input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-finite input (BigNumber)", async () => {
        try {
          await encoder.encodeTransaction(abi, [new BigNumber(NaN)]);
          assert.fail("Non-finite input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects unsafe number input (positive)", async () => {
        try {
          await encoder.encodeTransaction(abi, [1000000]);
          assert.fail("Unsafe input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects unsafe number input (negative)", async () => {
        try {
          await encoder.encodeTransaction(abi, [-1000000]);
          assert.fail("Unsafe input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects too-precise input (number)", async () => {
        try {
          await encoder.encodeTransaction(abi, [1e-11]);
          assert.fail("Too many decimal places should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects too-precise input (string)", async () => {
        try {
          await encoder.encodeTransaction(abi, ["1e-11"]);
          assert.fail("Too many decimal places should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects too-precise input (Big)", async () => {
        try {
          await encoder.encodeTransaction(abi, [new Big("1e-11")]);
          assert.fail("Too many decimal places should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects too-precise input (BigNumber)", async () => {
        try {
          await encoder.encodeTransaction(abi, [new BigNumber("1e-11")]);
          assert.fail("Too many decimal places should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects too-precise input (Ethers FixedNumber)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [FixedNumber.from("0.00000000001")] //couldn't find a better way
          );
          assert.fail("Too many decimal places should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects input with a unit", async () => {
        try {
          await encoder.encodeTransaction(abi, ["1 wei"]);
          assert.fail("Units not allowed on decimals");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects input that is a unit", async () => {
        try {
          await encoder.encodeTransaction(abi, ["wei"]);
          assert.fail("Units not allowed as decimals");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects hexadecimal input", async () => {
        try {
          await encoder.encodeTransaction(abi, ["0x1"]);
          assert.fail("Hex not allowed for decimals");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects just whitespace", async () => {
        try {
          await encoder.encodeTransaction(abi, [" "]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other non-numeric strings", async () => {
        try {
          await encoder.encodeTransaction(abi, ["garbage"]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects Uint8Arrays", async () => {
        try {
          await encoder.encodeTransaction(abi, [new Uint8Array(1)]);
          assert.fail("Uint8Arrays not allowed as decimals");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other non-numeric input (test: null)", async () => {
        try {
          await encoder.encodeTransaction(abi, [null]);
          assert.fail("Null should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other non-numeric input (test: undefined)", async () => {
        try {
          await encoder.encodeTransaction(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other non-numeric input (test: {})", async () => {
        try {
          await encoder.encodeTransaction(abi, [{}]);
          assert.fail("Empty object should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type (int)", async () => {
        try {
          await encoder.encodeTransaction(abi, [{ type: "int", value: "1" }]);
          assert.fail("Value specified as int got encoded as decimal");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type (fixed128x18)", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            { type: "fixed128x18", value: "1" }
          ]);
          assert.fail(
            "Value specified as fixed128x18 got encoded as fixed168x10"
          );
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped value for wrong type", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "bool" },
          true
        );
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Value wrapped as bool got encoded as decimal");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects general wrapped error result", async () => {
        const wrapped = {
          type: enumType,
          kind: "error",
          error: {
            kind: "ReadErrorStack",
            from: 0,
            to: 0
          }
        };
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Error result (of general sort) got encoded as decimal");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });

    describe("Integers and enums", () => {
      let encoder: Encoder.ContractEncoder;
      let enumType: Codec.Format.Types.EnumType;
      let alternateEnumType: Codec.Format.Types.EnumType;
      let shortEnumType: Codec.Format.Types.EnumType;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations }
        });
        const userDefinedTypes = encoder
          .getProjectEncoder()
          .getUserDefinedTypes();
        enumType = <Codec.Format.Types.EnumType>(
          Object.values(userDefinedTypes).find(
            type =>
              type.typeClass === "enum" &&
              type.typeName === "Color" &&
              type.kind === "local" &&
              type.definingContractName === "TestContract"
          )
        );
        alternateEnumType = <Codec.Format.Types.EnumType>(
          Object.values(userDefinedTypes).find(
            type =>
              type.typeClass === "enum" &&
              type.typeName === "MinusColor" &&
              type.kind === "local" &&
              type.definingContractName === "TestContract"
          )
        );
        shortEnumType = <Codec.Format.Types.EnumType>(
          Object.values(userDefinedTypes).find(
            type =>
              type.typeClass === "enum" &&
              type.typeName === "ShortEnum" &&
              type.kind === "local" &&
              type.definingContractName === "TestContract"
          )
        );
      });

      describe("8-bit signed", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry => entry.type === "function" && entry.name === "takesInt8"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
        });

        it("Encodes numbers", async () => {
          const { data } = await encoder.encodeTransaction(abi, [1]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes negative numbers", async () => {
          const { data } = await encoder.encodeTransaction(abi, [-1]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes boxed numbers", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Number(1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes bigints", async () => {
          const { data } = await encoder.encodeTransaction(abi, [BigInt(1)]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes negative bigints", async () => {
          const { data } = await encoder.encodeTransaction(abi, [BigInt(-1)]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes BNs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [new BN(1)]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes negative BNs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [new BN(-1)]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes Bigs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [new Big(1)]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes negative Bigs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Big("-1")
          ]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes BigNumbers (MikeMcl)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new BigNumber(1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes negative BigNumbers (MikeMcl)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new BigNumber(-1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes BigNumbers (ethers)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            EthersBigNumber.from(1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes negative BigNumbers (ethers)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            EthersBigNumber.from(-1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes FixedNumbers", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            FixedNumber.from(1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes negative FixedNumbers", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            FixedNumber.from(-1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes numeric strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 1 "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes negative numeric strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" -1 "]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes hexadecimal strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 0xa "]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000000a"
          );
        });

        it("Encodes hexadecimal strings (uppercase)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 0XA "]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000000a"
          );
        });

        it("Encodes negated hexadecimal strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" -0xa "]);
          assert.strictEqual(
            data,
            selector +
              "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6"
          );
        });

        it("Encodes octal strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 0o10 "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000008"
          );
        });

        it("Encodes negated octal strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" -0o10 "]);
          assert.strictEqual(
            data,
            selector +
              "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8"
          );
        });

        it("Encodes binary strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 0b10 "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes negated binary strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" -0b10 "]);
          assert.strictEqual(
            data,
            selector +
              "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe"
          );
        });

        it("Encodes scientific notation", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" -1e0 "]);
          assert.strictEqual(
            data,
            selector +
              "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          );
        });

        it("Encodes numeric strings with units", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 2 wei "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes numeric strings with units (no space)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 2wei "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes negative numeric strings with units", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" -2 wei "]);
          assert.strictEqual(
            data,
            selector +
              "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe"
          );
        });

        it("Encodes numeric strings that are units", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" wei "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes boxed numeric strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new String(" 1 ")
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes Uint8Arrays", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Uint8Array([1])
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes Uint8Array-likes", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { length: 1, 0: 1, garbage: "garbage" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes type/value pairs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "int8", value: "1" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped integer values (signed)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "int", bits: 8 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped integer values (unsigned)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "uint", bits: 8 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped fixed-point values (signed)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "fixed", bits: 168, places: 10 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped fixed-point values (unsigned)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "ufixed", bits: 168, places: 10 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped enum values", async () => {
          const wrapped = await encoder.wrapElementaryValue(enumType, 1);
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes enum out-of-range errors", async () => {
          const wrapped = {
            type: enumType,
            kind: "error",
            error: {
              kind: "EnumOutOfRangeError",
              type: enumType,
              rawAsBN: new BN(16)
            }
          };
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000010"
          );
        });

        it("Rejects out-of-range input (number, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [128]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (number, negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, [-129]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (string, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, ["128"]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (string, negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, ["-129"]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (bigint, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [BigInt(128)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (bigint, negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, [BigInt(-129)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (BN, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BN(128)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (BN, negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BN(-129)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Big, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Big(128)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Big, negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Big(-129)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (BigNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(128)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (BigNumber, negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(-129)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Ethers BigNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [EthersBigNumber.from(128)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Ethers BigNumber, negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, [EthersBigNumber.from(-129)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Ethers FixedNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [FixedNumber.from(128)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Ethers FixedNumber, negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, [FixedNumber.from(-129)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Uint8Array)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Uint8Array([128])]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-finite input (number)", async () => {
          try {
            await encoder.encodeTransaction(abi, [NaN]);
            assert.fail("Non-finite input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-finite input (BigNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(NaN)]);
            assert.fail("Non-finite input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (number)", async () => {
          try {
            await encoder.encodeTransaction(abi, [1.5]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (string)", async () => {
          try {
            await encoder.encodeTransaction(abi, ["1.5"]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (Big)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Big(1.5)]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (BigNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(1.5)]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (Ethers FixedNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [FixedNumber.from("1.5")]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects just whitespace", async () => {
          try {
            await encoder.encodeTransaction(abi, [" "]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects bare minus sign", async () => {
          try {
            await encoder.encodeTransaction(abi, ["-"]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects double negatives", async () => {
          try {
            await encoder.encodeTransaction(abi, ["--0"]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects double minus sign", async () => {
          try {
            await encoder.encodeTransaction(abi, ["--"]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects unrecognized unit", async () => {
          try {
            await encoder.encodeTransaction(abi, ["2 kwei"]);
            assert.fail("Unrecognized unit got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects invalid hexadecimal", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0xg"]);
            assert.fail("Bad hexadecimal got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects invalid octal", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0xo"]);
            assert.fail("Bad octal got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects invalid binary", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0b2"]);
            assert.fail("Bad binary got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: -1 }]);
            assert.fail("Accepted negative byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 0.5 }]);
            assert.fail("Accepted fractional byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: "garbage" }]);
            assert.fail("Accepted non-numeric byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 0.5 }]);
            assert.fail("Accepted fractional length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: -1 }]);
            assert.fail("Accepted negative length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects unsafely large length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1e100 }]);
            assert.fail("Accepted unsafely large length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: "garbage" }]);
            assert.fail("Accepted non-numeric length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other non-numeric strings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["garbage"]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other non-numeric input (test: null)", async () => {
          try {
            await encoder.encodeTransaction(abi, [null]);
            assert.fail("Null should not be encoded as a number");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other non-numeric input (test: undefined)", async () => {
          try {
            await encoder.encodeTransaction(abi, [undefined]);
            assert.fail("Undefined should not be encoded as a number");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other non-numeric input (test: {})", async () => {
          try {
            await encoder.encodeTransaction(abi, [{}]);
            assert.fail("Empty object should not be encoded as a number");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (string)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "string", value: "1" }
            ]);
            assert.fail("Value specified as string got encoded as int8");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (uint8)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "uint8", value: "1" }
            ]);
            assert.fail("Value specified as uint8 got encoded as int8");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (int256)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "int256", value: "1" }
            ]);
            assert.fail("Value specified as int256 got encoded as int8");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (int)", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ type: "int", value: "1" }]);
            assert.fail("Value specified as int got encoded as int8");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects wrapped value for wrong type", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "bool" },
            true
          );
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Value wrapped as bool got encoded as integer");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects general wrapped error result", async () => {
          const wrapped = {
            type: enumType,
            kind: "error",
            error: {
              kind: "ReadErrorStack",
              from: 0,
              to: 0
            }
          };
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail(
              "Error result (of general sort) got encoded as integer"
            );
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });

      describe("8-bit unsigned", () => {
        let abi: Abi.FunctionEntry;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry => entry.type === "function" && entry.name === "takesUint8"
            )
          );
        });

        it("Rejects out-of-range input (number, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [256]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (number)", async () => {
          try {
            await encoder.encodeTransaction(abi, [-1]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (string, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, ["256"]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (string)", async () => {
          try {
            await encoder.encodeTransaction(abi, ["-1"]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (bigint, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [BigInt(256)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (bigint)", async () => {
          try {
            await encoder.encodeTransaction(abi, [BigInt(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (BN, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BN(256)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (BN)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BN(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Big, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Big(256)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (Big)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Big(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (BigNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(256)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (BigNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Ethers BigNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [EthersBigNumber.from(256)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (Ethers BigNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [EthersBigNumber.from(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Ethers FixedNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [FixedNumber.from(256)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (Ethers FixedNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [FixedNumber.from(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });

      describe("256-bit signed", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry => entry.type === "function" && entry.name === "takesInt"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
        });

        it("Encodes values with units", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 16 gwei "]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000003b9aca000"
          );
        });

        it("Encodes values that are units", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" gwei "]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000003b9aca00"
          );
        });

        it("Encodes Uint8Arrays", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Uint8Array([1, 255])
          ]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000001ff"
          );
        });

        it("Encodes type/value pairs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "int256", value: "1" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes type/value pairs (short form)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "int", value: "1" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped integer values", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "int", bits: 256 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped integer values (of different type)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "int", bits: 8 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Rejects unsafe integer input (positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [2 ** 53]);
            assert.fail("Unsafe input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects unsafe integer input (negative)", async () => {
          try {
            await encoder.encodeTransaction(abi, [-(2 ** 53)]);
            assert.fail("Unsafe input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects bytes above 255", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 256 }]);
            assert.fail("Accepted byte above 255");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (int8)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "int8", value: "1" }
            ]);
            assert.fail("Value specified as int8 got encoded as int256");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (uint256)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "uint256", value: "1" }
            ]);
            assert.fail("Value specified as uint256 got encoded as int256");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (uint)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "uint", value: "1" }
            ]);
            assert.fail("Value specified as uint got encoded as int");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });

      describe("256-bit unsigned", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry => entry.type === "function" && entry.name === "takesUint"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
        });

        it("Encodes type/value pairs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "uint256", value: "1" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes type/value pairs (short form)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "uint", value: "1" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped integer values", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "uint", bits: 256 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped integer values (of different type)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "uint", bits: 8 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Rejects type/value pair for wrong type (uint8)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "uint8", value: "1" }
            ]);
            assert.fail("Value specified as uint8 got encoded as uint256");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (int256)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "int256", value: "1" }
            ]);
            assert.fail("Value specified as int256 got encoded as uint256");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (int)", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ type: "int", value: "1" }]);
            assert.fail("Value specified as int got encoded as uint");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });

      describe("Enumerated types", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;
        let globalAbi: Abi.FunctionEntry;
        let globalSelector: string;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry => entry.type === "function" && entry.name === "takesColor"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
          globalAbi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry =>
                entry.type === "function" && entry.name === "takesGlobalColor"
            )
          );
          globalSelector = Codec.AbiData.Utils.abiSelector(globalAbi);
        });

        it("Encodes numbers", async () => {
          const { data } = await encoder.encodeTransaction(abi, [1]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes boxed numbers", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Number(1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes bigints", async () => {
          const { data } = await encoder.encodeTransaction(abi, [BigInt(1)]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes BNs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [new BN(1)]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes Bigs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [new Big(1)]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes BigNumbers (MikeMcl)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new BigNumber(1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes BigNumbers (ethers)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            EthersBigNumber.from(1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes FixedNumbers", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            FixedNumber.from(1)
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes numeric strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 1 "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes hexadecimal strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 0x1 "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes octal strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 0o1 "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes binary strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 0b1 "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes scientific notation", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 1e0 "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes numeric strings with units", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 2 wei "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes numeric strings with units (no space)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" 2wei "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes numeric strings that are units", async () => {
          const { data } = await encoder.encodeTransaction(abi, [" wei "]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes enum option names", async () => {
          const { data } = await encoder.encodeTransaction(abi, ["Red"]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000004"
          );
        });

        it("Encodes enum option names with specified enum", async () => {
          const { data } = await encoder.encodeTransaction(abi, ["Color.Red"]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000004"
          );
        });

        it("Encodes enum option names with specified enum & contract", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            "TestContract.Color.Red"
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000004"
          );
        });

        it("Encodes global enum option names", async () => {
          const { data } = await encoder.encodeTransaction(globalAbi, ["Red"]);
          assert.strictEqual(
            data,
            globalSelector +
              "0000000000000000000000000000000000000000000000000000000000000006"
          );
        });

        it("Encodes global enum option names with specified enum", async () => {
          const { data } = await encoder.encodeTransaction(globalAbi, [
            "GlobalColor.Red"
          ]);
          assert.strictEqual(
            data,
            globalSelector +
              "0000000000000000000000000000000000000000000000000000000000000006"
          );
        });

        it("Encodes boxed strings", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new String(" 1 ")
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes Uint8Arrays", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            new Uint8Array([1])
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes Uint8Array-likes", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { length: 1, 0: 1, garbage: "garbage" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes type/value pairs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "enum", value: "1" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes type/value pairs using underlying uint type", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { type: "uint8", value: "1" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped integer values (signed)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "int", bits: 8 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped integer values (unsigned)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "uint", bits: 8 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped fixed-point values (signed)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "fixed", bits: 168, places: 10 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped fixed-point values (unsigned)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "ufixed", bits: 168, places: 10 },
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped enum values (same)", async () => {
          const wrapped = await encoder.wrapElementaryValue(enumType, 1);
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes wrapped enum values (different)", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            alternateEnumType,
            1
          );
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes enum out-of-range errors", async () => {
          const wrapped = {
            type: shortEnumType,
            kind: "error",
            error: {
              kind: "EnumOutOfRangeError",
              type: enumType,
              rawAsBN: new BN(7)
            }
          };
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000007"
          );
        });

        it("Rejects out-of-range input (number, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [8]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (number)", async () => {
          try {
            await encoder.encodeTransaction(abi, [-1]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (string, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, ["8"]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (string)", async () => {
          try {
            await encoder.encodeTransaction(abi, ["-1"]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (bigint, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [BigInt(8)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (bigint)", async () => {
          try {
            await encoder.encodeTransaction(abi, [BigInt(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (BN, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BN(8)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (BN)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BN(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Big, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Big(8)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (Big)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Big(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (BigNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(8)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (BigNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Ethers BigNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [EthersBigNumber.from(8)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (Ethers BigNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [EthersBigNumber.from(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects out-of-range input (Ethers FixedNumber, positive)", async () => {
          try {
            await encoder.encodeTransaction(abi, [FixedNumber.from(8)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative input (Ethers FixedNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [FixedNumber.from(-1)]);
            assert.fail("Out-of-range input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-finite input (number)", async () => {
          try {
            await encoder.encodeTransaction(abi, [NaN]);
            assert.fail("Non-finite input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-finite input (BigNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(NaN)]);
            assert.fail("Non-finite input should cause exception");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (number)", async () => {
          try {
            await encoder.encodeTransaction(abi, [1.5]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (string)", async () => {
          try {
            await encoder.encodeTransaction(abi, ["1.5"]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (Big)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new Big(1.5)]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (BigNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [new BigNumber(1.5)]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer input (Ethers FixedNumber)", async () => {
          try {
            await encoder.encodeTransaction(abi, [FixedNumber.from("1.5")]);
            assert.fail("Non-integer input should be rejected");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects just whitespace", async () => {
          try {
            await encoder.encodeTransaction(abi, [" "]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects bare minus sign", async () => {
          try {
            await encoder.encodeTransaction(abi, ["-"]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects double negatives", async () => {
          try {
            await encoder.encodeTransaction(abi, ["--0"]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects double minus sign", async () => {
          try {
            await encoder.encodeTransaction(abi, ["--"]);
            assert.fail("Non-numeric string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects unrecognized unit", async () => {
          try {
            await encoder.encodeTransaction(abi, ["2 kwei"]);
            assert.fail("Unrecognized unit got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects invalid hexadecimal", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0xg"]);
            assert.fail("Bad hexadecimal got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects invalid octal", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0xo"]);
            assert.fail("Bad octal got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects invalid binary", async () => {
          try {
            await encoder.encodeTransaction(abi, ["0b2"]);
            assert.fail("Bad binary got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: -1 }]);
            assert.fail("Accepted negative byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: 0.5 }]);
            assert.fail("Accepted fractional byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric bytes", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1, 0: "garbage" }]);
            assert.fail("Accepted non-numeric byte");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects fractional length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 0.5 }]);
            assert.fail("Accepted fractional length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: -1 }]);
            assert.fail("Accepted negative length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects unsafely large length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: 1e100 }]);
            assert.fail("Accepted unsafely large length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-numeric length", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ length: "garbage" }]);
            assert.fail("Accepted non-numeric length");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects options with whitespace", async () => {
          try {
            await encoder.encodeTransaction(abi, [" Red "]);
            assert.fail("Option with whitespace accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects options for wrong enum", async () => {
          try {
            await encoder.encodeTransaction(abi, ["Short"]);
            assert.fail("Option for wrong enum accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects option with wrong enum specified", async () => {
          try {
            await encoder.encodeTransaction(abi, ["MinusColor.Red"]);
            assert.fail("Option for wrong enum accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects option with wrong contract specified", async () => {
          try {
            await encoder.encodeTransaction(abi, ["AuxContract.Color.Red"]);
            assert.fail("Option for wrong contract accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other strings", async () => {
          try {
            await encoder.encodeTransaction(abi, ["garbage"]);
            assert.fail("Non-numeric, non-option string got accepted");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: null)", async () => {
          try {
            await encoder.encodeTransaction(abi, [null]);
            assert.fail("Null should not be encoded as a number");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: undefined)", async () => {
          try {
            await encoder.encodeTransaction(abi, [undefined]);
            assert.fail("Undefined should not be encoded as a number");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: {})", async () => {
          try {
            await encoder.encodeTransaction(abi, [{}]);
            assert.fail("Empty object should not be encoded as a number");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair for wrong type (uint16)", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "uint16", value: "1" }
            ]);
            assert.fail("Value specified as uint16 got encoded as uint8 enum");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects wrapped value for wrong type", async () => {
          const wrapped = await encoder.wrapElementaryValue(
            { typeClass: "bool" },
            true
          );
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Value wrapped as bool got encoded as integer");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects general wrapped error result", async () => {
          const wrapped = {
            type: enumType,
            kind: "error",
            error: {
              kind: "ReadErrorStack",
              from: 0,
              to: 0
            }
          };
          try {
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail(
              "Error result (of general sort) got encoded as integer"
            );
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });
    });

    describe("Addresses and contracts", () => {
      let encoder: Encoder.ContractEncoder;
      let abi: Abi.FunctionEntry;
      let selector: string;
      let contractAbi: Abi.FunctionEntry;
      let contractSelector: string;
      let contractType: Codec.Format.Types.ContractType;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations },
          ens: { provider: config.provider, registryAddress }
        });
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesAddress"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
        contractAbi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesContract"
          )
        );
        contractSelector = Codec.AbiData.Utils.abiSelector(contractAbi);
        const userDefinedTypes = encoder
          .getProjectEncoder()
          .getUserDefinedTypes();
        contractType = <Codec.Format.Types.ContractType>(
          Object.values(userDefinedTypes).find(
            type =>
              type.typeClass === "contract" && type.typeName === "TestContract"
          )
        );
      });

      it("Encodes addresses with good checksum", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes addresses in all lowercase", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          "0x10ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes addresses in all uppercase", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          "0X10CA7E901D10CA7E901D10CA7E901D10CA7E901D"
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes addresses without 0x prefix", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          "10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes ICAP addresses", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          "XE19HOWVEXINGLYQUICKDAFTZEBRASJUMP"
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000435099d36c1e39b0718325d179e598075a395d1"
        );
      });

      it("Encodes objects with an address field", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          {
            address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            garbage: "garbage"
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes ENS names", async () => {
        const { data } = await encoder.encodeTransaction(abi, ["locate.gold"]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes contracts", async () => {
        const { data } = await encoder.encodeTransaction(contractAbi, [
          "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
        ]);
        assert.strictEqual(
          data,
          contractSelector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes type/value pairs (address)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          {
            type: "address",
            value: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes type/value pairs (contract)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          {
            type: "contract",
            value: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes wrapped addresses", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "address", kind: "general" },
          "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Encodes wrapped contracts", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          contractType,
          "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Rejects bad checksum w/ mixed-case", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901d"
          ]);
          assert.fail("Bad checksum should not be encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bad ICAP checksum", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            "XE18HOWVEXINGLYQUICKDAFTZEBRASJUMP"
          ]);
          assert.fail("Bad ICAP checksum should not be encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects incorrect length (long)", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            "0x0010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
          ]);
          assert.fail("Wrong-length address should not be encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects incorrect length (short)", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            "0xca7e901d10ca7e901d10ca7e901d10ca7e901d"
          ]);
          assert.fail("Wrong-length address should not be encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects incorrect length (long, no prefix)", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            "0010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
          ]);
          assert.fail("Wrong-length address should not be encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects incorrect length (short, no prefix)", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            "ca7e901d10ca7e901d10ca7e901d10ca7e901d"
          ]);
          assert.fail("Wrong-length address should not be encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects unknown ENS name", async () => {
        try {
          await encoder.encodeTransaction(abi, ["garbage.eth"]);
          assert.fail("Unknown ENS names should not be encoded");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects objects with a selector field", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            {
              address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              selector: "0xdeadbeef"
            }
          ]);
          assert.fail("Contract objects must not have selector field");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: null)", async () => {
        try {
          await encoder.encodeTransaction(abi, [null]);
          assert.fail("Null should not be encoded as an address");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: undefined)", async () => {
        try {
          await encoder.encodeTransaction(abi, [undefined]);
          assert.fail("Undefined should not be encoded as an address");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: {})", async () => {
        try {
          await encoder.encodeTransaction(abi, [{}]);
          assert.fail("Empty object should not be encoded as an address");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            {
              type: "bytes20",
              value: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
            }
          ]);
          assert.fail("Value specified as bytes20 got encoded as address");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped value for wrong type", async () => {
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "bytes", kind: "static", length: 20 },
          "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
        );
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Value wrapped as bytes20 got encoded as address");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped error result", async () => {
        const wrapped = {
          type: { typeClass: "address", kind: "general" },
          kind: "error",
          error: {
            kind: "ReadErrorStack",
            from: 0,
            to: 0
          }
        };
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Error result got encoded as address");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });

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
          const { data } = await encoder.encodeTransaction(abi, [[1, 2]]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes arrays with mixed representations", async () => {
          const { data } = await encoder.encodeTransaction(abi, [[1, "2"]]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes type/value pairs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
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
          const { data } = await encoder.encodeTransaction(abi, [
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
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
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
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Rejects an array with a bad element", async () => {
          try {
            await encoder.encodeTransaction(abi, [[1, 2.5]]);
            assert.fail("Array with bad element got encoded anyway");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects array of incorrect length (long)", async () => {
          try {
            await encoder.encodeTransaction(abi, [[1, 2, 3]]);
            assert.fail("Overlong array got encoded");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects array of incorrect length (short)", async () => {
          try {
            await encoder.encodeTransaction(abi, [[1]]);
            assert.fail("Short array got encoded");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: null)", async () => {
          try {
            await encoder.encodeTransaction(abi, [null]);
            assert.fail("Null should not be encoded as an array");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: undefined)", async () => {
          try {
            await encoder.encodeTransaction(abi, [undefined]);
            assert.fail("Undefined should not be encoded as an array");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: {})", async () => {
          try {
            await encoder.encodeTransaction(abi, [{}]);
            assert.fail("Empty object should not be encoded as an array");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects array with element of wrong specified type", async () => {
          try {
            await encoder.encodeTransaction(abi, [
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
            await encoder.encodeTransaction(abi, [
              { type: "tuple", value: [1, 2] }
            ]);
            assert.fail("Value specified as tuple got encoded as array");
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
            await encoder.encodeTransaction(abi, [wrapped]);
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
            await encoder.encodeTransaction(abi, [wrapped]);
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
          const { data } = await encoder.encodeTransaction(abi, [[1, 2]]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes arrays with mixed representations", async () => {
          const { data } = await encoder.encodeTransaction(abi, [[1, "2"]]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes type/value pairs", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
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
          const { data } = await encoder.encodeTransaction(abi, [
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
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
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
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Rejects an array with a bad element", async () => {
          try {
            await encoder.encodeTransaction(abi, [[1, 2.5]]);
            assert.fail("Array with bad element got encoded anyway");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: null)", async () => {
          try {
            await encoder.encodeTransaction(abi, [null]);
            assert.fail("Null should not be encoded as an array");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: undefined)", async () => {
          try {
            await encoder.encodeTransaction(abi, [undefined]);
            assert.fail("Undefined should not be encoded as an array");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: {})", async () => {
          try {
            await encoder.encodeTransaction(abi, [{}]);
            assert.fail("Empty object should not be encoded as an array");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects array with element of wrong specified type", async () => {
          try {
            await encoder.encodeTransaction(abi, [
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
            await encoder.encodeTransaction(abi, [
              { type: "tuple", value: [1, 2] }
            ]);
            assert.fail("Value specified as tuple got encoded as array");
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
            await encoder.encodeTransaction(abi, [wrapped]);
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
            await encoder.encodeTransaction(abi, [wrapped]);
            assert.fail("Error result got encoded as array");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });
    });

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
          const { data } = await encoder.encodeTransaction(abi, [["0xff", 1]]);
          assert.strictEqual(
            data,
            selector +
              "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes objects (possibly with extra keys)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { x: "0xff", y: 1, garbage: "garbage" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes objects regardless of key order", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { garbage: "garbage", y: 1, x: "0xff" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Encodes type/value pairs (struct)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
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
          const { data } = await encoder.encodeTransaction(abi, [
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
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
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
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
          );
        });

        it("Rejects an array with a bad element", async () => {
          try {
            await encoder.encodeTransaction(abi, [[255, 1]]);
            assert.fail("Array with bad element got encoded anyway");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects array of incorrect length (long)", async () => {
          try {
            await encoder.encodeTransaction(abi, [["0xff", 2, undefined]]);
            assert.fail("Overlong array got encoded");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects array of incorrect length (short)", async () => {
          try {
            await encoder.encodeTransaction(abi, [["0xff"]]);
            assert.fail("Short array got encoded");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects object with missing keys", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ x: "0xff" }]);
            assert.fail("Missing key should cause error");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects object with bad values", async () => {
          try {
            await encoder.encodeTransaction(abi, [{ x: 255, y: 1 }]);
            assert.fail("Error in element should cause error");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: null)", async () => {
          try {
            await encoder.encodeTransaction(abi, [null]);
            assert.fail("Null should not be encoded as a struct");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects other input (test: undefined)", async () => {
          try {
            await encoder.encodeTransaction(abi, [undefined]);
            assert.fail("Undefined should not be encoded as a struct");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects type/value pair with wrong type", async () => {
          try {
            await encoder.encodeTransaction(abi, [
              { type: "array", value: ["0xff", "1"] }
            ]);
            assert.fail("Value specified as array got encoded as struct");
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
            await encoder.encodeTransaction(abi, [wrapped]);
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
            await encoder.encodeTransaction(abi, [wrapped]);
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
            await encoder.encodeTransaction(abi, [wrapped]);
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
          const { data } = await encoder.encodeTransaction(abi, [["1", "ABC"]]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes objects", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { x: "1", y: "ABC" }
          ]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes objects regardless of key order", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
            { y: "ABC", x: 1 }
          ]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes type/value pairs (struct)", async () => {
          const { data } = await encoder.encodeTransaction(abi, [
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
          const { data } = await encoder.encodeTransaction(abi, [
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
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
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
          const { data } = await encoder.encodeTransaction(abi, [wrapped]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
          );
        });
      });
    });

    describe("External function pointers", () => {
      let encoder: Encoder.ContractEncoder;
      let abi: Abi.FunctionEntry;
      let selector: string;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations }
        });
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesFunction"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes objects w/ address & selector", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          {
            address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            selector: "0xdeadbeef",
            garbage: "garbage"
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
        );
      });

      it("Encodes objects w/ address & selector (unusual forms for these)", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          {
            address: { address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D" },
            selector: [222, 173, 190, 239],
            garbage: "garbage"
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
        );
      });

      it("Encodes bytestrings of length 24 & ignores checksum", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901ddeadbeef"
        ]);
        assert.strictEqual(
          data,
          selector +
            "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
        );
      });

      it("Encodes type/value pairs", async () => {
        const { data } = await encoder.encodeTransaction(abi, [
          {
            type: "function",
            value: {
              address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              selector: "0xdeadbeef",
              garbage: "garbage"
            }
          }
        ]);
        assert.strictEqual(
          data,
          selector +
            "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
        );
      });

      it("Encodes wrapped external function pointers", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "function",
            visibility: "external",
            kind: "general"
          },
          {
            address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            selector: "0xdeadbeef",
            garbage: "garbage"
          }
        );
        const { data } = await encoder.encodeTransaction(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
        );
      });

      it("Rejects address with bad checksum", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            {
              address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901d",
              selector: "0xdeadbeef",
              garbage: "garbage"
            }
          ]);
          assert.fail("Encoded function pointer with bad checksum");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects selector with wrong length", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            {
              address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              selector: "0xdeadbeef00",
              garbage: "garbage"
            }
          ]);
          assert.fail("Encoded function pointer with overlong selector");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects missing selector field", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            {
              address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              garbage: "garbage"
            }
          ]);
          assert.fail("Encoded function pointer w/o selector");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects missing address field", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            {
              selector: "0xdeadbeef",
              garbage: "garbage"
            }
          ]);
          assert.fail("Encoded function pointer w/o address");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrong-length bytestring", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901ddeadbeef00"
          ]);
          assert.fail("Encoded external function pointer of wrong length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: null)", async () => {
        try {
          await encoder.encodeTransaction(abi, [null]);
          assert.fail("Null should not be encoded as a function pointer");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: undefined)", async () => {
        try {
          await encoder.encodeTransaction(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a function pointer");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair with wrong type", async () => {
        try {
          await encoder.encodeTransaction(abi, [
            {
              type: "struct",
              value: {
                address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                selector: "0xdeadbeef"
              }
            }
          ]);
          assert.fail("Value specified as struct got encoded as function");
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
              {
                name: "address",
                type: {
                  typeClass: "address",
                  kind: "general"
                }
              },
              {
                name: "selector",
                type: {
                  typeClass: "bytes",
                  kind: "static",
                  length: 4
                }
              }
            ]
          },
          {
            address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            selector: "0xdeadbeef"
          }
        );
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Value wrapped as struct got encoded as function");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped error result", async () => {
        const wrapped = {
          type: {
            typeClass: "function",
            visibility: "external",
            kind: "general"
          },
          kind: "error",
          error: {
            kind: "ReadErrorStack",
            from: 0,
            to: 1
          }
        };
        try {
          await encoder.encodeTransaction(abi, [wrapped]);
          assert.fail("Error result got encoded as function");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });

    describe("Transaction options", () => {
      let encoder: Encoder.ContractEncoder;
      let abi: Abi.FunctionEntry;
      let selector: string;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations }
        });
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesVoid"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes transaction options", async () => {
        const result = await encoder.encodeTransaction(
          abi,
          [
            {
              gas: 1,
              gasPrice: 2,
              value: 3,
              nonce: 4,
              from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              to: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              data: "0x0bad",
              overwrite: true,
              privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
            }
          ],
          { allowOptions: true }
        );
        const expected = {
          gas: new BN(1),
          gasPrice: new BN(2),
          value: new BN(3),
          nonce: new BN(4),
          from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
          to: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
          data: selector, //note input data is ignored!
          overwrite: true,
          privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
        };
        checkEqTx(result, expected);
      });

      it("Encodes transaction options with extra & missing keys", async () => {
        const result = await encoder.encodeTransaction(
          abi,
          [
            {
              from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
              garbage: "garbage"
            }
          ],
          { allowOptions: true }
        );
        const expected = {
          from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
          data: selector,
          privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
        };
        assert.deepEqual(result, expected); //no BNs here!
      });

      it("Encodes transaction options in unusual forms", async () => {
        const result = await encoder.encodeTransaction(
          abi,
          [
            {
              gas: "1e9",
              gasPrice: "2 gwei",
              value: "3 finney",
              nonce: EthersBigNumber.from(4),
              from: { address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D" },
              to: "0x10CA7E901D10CA7E901D10CA7E901D10CA7E901D",
              data: [255],
              overwrite: new Boolean(false)
            }
          ],
          { allowOptions: true }
        );
        const expected = {
          gas: new BN(1e9),
          gasPrice: new BN(2e9),
          value: new BN(3e15),
          nonce: new BN(4),
          from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
          to: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
          data: selector, //note input data is ignored!
          overwrite: false
        };
        checkEqTx(result, expected);
      });

      it("Encodes type/value pair", async () => {
        const result = await encoder.encodeTransaction(
          abi,
          [
            {
              type: "options",
              value: {
                from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
                garbage: "garbage"
              }
            }
          ],
          { allowOptions: true }
        );
        const expected = {
          from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
          data: selector,
          privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
        };
        assert.deepEqual(result, expected); //no BNs here!
      });

      it("Encodes wrapped options", async () => {
        const wrapped = await encoder.wrap(
          { typeClass: "options" },
          {
            from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
            privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
          }
        );
        const result = await encoder.encodeTransaction(abi, [wrapped], {
          allowOptions: true
        });
        const expected = {
          from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
          data: selector,
          privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="]
        };
        assert.deepEqual(result, expected); //no BNs here!
      });

      it("Rejects bad integer option", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                value: "2.5 wei"
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Encoded bad value option");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bad address option", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901d"
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Encoded bad from option");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bad bytes option", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                data: "0xf"
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Encoded bad data option");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bad privateFor option (array null)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                privateFor: null
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Encoded bad privateFor option");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bad privateFor option (string null)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                privateFor: [null]
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Encoded bad privateFor option");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bad privateFor option (not base64)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                privateFor: ["This-String-Contains-Bad-Characters-You-See="]
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Encoded bad privateFor option");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bad privateFor option (too short)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow"]
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Encoded bad privateFor option");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bad privateFor option (too long)", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNowThis"]
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Encoded bad privateFor option");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects object with no relevant keys", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                garbage: "garbage"
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Options had no valid options as keys");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: undefined)", async () => {
        try {
          await encoder.encodeTransaction(abi, [undefined], {
            allowOptions: true
          });
          assert.fail("Undefined got encoded as options");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: null)", async () => {
        try {
          await encoder.encodeTransaction(abi, [null], { allowOptions: true });
          assert.fail("Null got encoded as options");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair with wrong tpe", async () => {
        try {
          await encoder.encodeTransaction(
            abi,
            [
              {
                type: "tuple",
                value: {
                  from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                  privateFor: ["ThisIsAFakeExamplePublicKeySoAnswerMeNow2+2="],
                  garbage: "garbage"
                }
              }
            ],
            { allowOptions: true }
          );
          assert.fail("Value specified as tuple got encoded as options");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects wrapped value of wrong type", async () => {
        const wrapped = await encoder.wrap(
          {
            typeClass: "tuple",
            memberTypes: [
              {
                name: "from",
                type: { typeClass: "address", kind: "general" }
              }
            ]
          },
          {
            from: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
          }
        );
        try {
          await encoder.encodeTransaction(abi, [wrapped], {
            allowOptions: true
          });
          assert.fail("Value wrapped as tuple got encoded as options");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });

    describe("Multiple arguments", () => {
      let encoder: Encoder.ContractEncoder;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations }
        });
      });

      describe("Static", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;
        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry =>
                entry.type === "function" && entry.name === "takesMultiple"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
        });

        it("Encodes multiple arguments", async () => {
          const { data } = await encoder.encodeTransaction(abi, [1, 2]);
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
          );
        });

        it("Encodes multiple arguments & options", async () => {
          const { value, data } = await encoder.encodeTransaction(
            abi,
            [1, 2, { value: 1 }],
            { allowOptions: true }
          );
          assert.strictEqual(
            data,
            selector +
              "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
          );
          assert(BN.isBN(value));
          assert((<BN>value).eqn(1));
        });

        it("Rejects if there's a bad argument", async () => {
          try {
            await encoder.encodeTransaction(abi, [256, 2]);
            assert.fail("Arguments got encoded though one invalid");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects if too few arguments", async () => {
          try {
            await encoder.encodeTransaction(abi, [1]);
            assert.fail("Too few arguments should fail");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects if options given but not turned on", async () => {
          try {
            await encoder.encodeTransaction(abi, [1, 2, { value: 1 }]);
            assert.fail("Can't take options if options not turned on");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects if additional argument but not options", async () => {
          try {
            await encoder.encodeTransaction(abi, [1, 2, 3], {
              allowOptions: true
            });
            assert.fail(
              "Additional argument should be rejected if not options"
            );
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects if multiple extra arguments", async () => {
          try {
            await encoder.encodeTransaction(
              abi,
              [1, 2, { value: 1 }, { overwrite: true }],
              { allowOptions: true }
            );
            assert.fail("Should reject if multiple extra arguments");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });
      });

      describe("Dynamic", () => {
        let abi: Abi.FunctionEntry;
        let selector: string;

        beforeAll(() => {
          abi = <Abi.FunctionEntry>(
            Abi.normalize(artifacts.TestContract.abi).find(
              entry =>
                entry.type === "function" &&
                entry.name === "takesMultipleDynamic"
            )
          );
          selector = Codec.AbiData.Utils.abiSelector(abi);
        });

        it("Encodes multiple arguments", async () => {
          const { data } = await encoder.encodeTransaction(abi, [1, "ABC"]);
          assert.strictEqual(
            data,
            selector +
              "0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
          );
        });
      });
    });

    describe("Constructors", () => {
      let encoder: Encoder.ContractEncoder;
      let abi: Abi.ConstructorEntry;
      let bytecode: string;

      beforeAll(async () => {
        encoder = await Encoder.forArtifact(artifacts.TestContract, {
          projectInfo: { compilations }
        });
        abi = <Abi.ConstructorEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "constructor"
          )
        );
        bytecode = Shims.NewToLegacy.forBytecode(
          artifacts.TestContract.bytecode
        );
      });

      it("Encodes constructors", async () => {
        const { data } = await encoder.encodeTransaction(abi, [1]);
        assert.strictEqual(
          data,
          bytecode +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });
    });
  });

  describe("Overload resolution", () => {
    let encoder: Encoder.ContractEncoder;
    beforeAll(async () => {
      encoder = await Encoder.forArtifact(artifacts.TestContract, {
        projectInfo: { compilations }
      });
    });

    describe("Overall priority", () => {
      let abis: Abi.FunctionEntry[];
      beforeAll(() => {
        abis = <Abi.FunctionEntry[]>(
          Abi.normalize(artifacts.TestContract.abi).filter(
            entry => entry.type === "function" && entry.name === "overloaded"
          )
        );
      });

      it("Prefers transaction options to arrays", async () => {
        let arrayOrOptions: any = [];
        arrayOrOptions.overwrite = true;
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [arrayOrOptions],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 0);
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        const expected = { overwrite: true, data: selector };
        assert.deepEqual(tx, expected);
      });

      it("Prefers arrays to structs and tuples", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [["0xff"]], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint8[]");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000ff"
        );
      });

      it("Prefers arrays to addresses", async () => {
        let addressOrArray: any = [];
        addressOrArray.address = "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D";
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [addressOrArray],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint8[]");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Prefers structs and tuples to bytestrings", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [{ length: 1, 0: 255 }],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "tuple");
        assert.lengthOf(<Abi.Parameter[]>abi.inputs[0].components, 1);
        assert.strictEqual(
          (<Abi.Parameter[]>abi.inputs[0].components)[0].type,
          "uint8"
        );
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Prefers addresses to bytestrings", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          ["0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "address");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
        );
      });

      it("Prefers bytestrings to functions", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          ["0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901Ddeadbeef"],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "bytes32");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
        );
      });

      it("Prefers bytestrings to numeric types", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, ["0xff"], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "bytes32");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Prefers external function pointers to bools", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [
            {
              address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              selector: "0xdeadbeef"
            }
          ],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "function");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
        );
      });

      it("Prefers (non-enum) numbers to enums", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [1], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint256");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Prefers enums to strings", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, ["Red"], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint8");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000004"
        );
      });

      it("Prefers strings to bools", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [""], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "string");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes as bool as last resort", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [{}], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "bool");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Rejects if no match", async () => {
        try {
          await encoder.resolveAndEncode(
            abis,
            [{ type: "fixed", value: "1" }],
            { allowOptions: true }
          );
          assert.fail("Should reject when no overloads match");
        } catch (error) {
          if (error.name !== "NoOverloadsMatchedError") {
            throw error;
          }
        }
      });

      it("Prefers transaction options to structs", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [
            {
              overwrite: true,
              x: "0xff",
              y: 1
            }
          ],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 0);
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        const expected = { overwrite: true, data: selector };
        assert.deepEqual(tx, expected);
      });

      it("Prefers transaction options to addresses", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [
            {
              overwrite: true,
              address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
            }
          ],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 0);
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        const expected = { overwrite: true, data: selector };
        assert.deepEqual(tx, expected);
      });

      it("Prefers transaction options to bytestrings", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [
            {
              overwrite: true,
              encoding: "utf8",
              text: "ABC"
            }
          ],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 0);
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        const expected = { overwrite: true, data: selector };
        assert.deepEqual(tx, expected);
      });

      it("Prefers transaction options to external function pointers", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [
            {
              overwrite: true,
              address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
              selector: "0xdeadbeef"
            }
          ],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 0);
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        const expected = { overwrite: true, data: selector };
        assert.deepEqual(tx, expected);
      });

      it("Prefers arrays to external function pointers", async () => {
        let functionOrArray: any = [];
        functionOrArray.address = "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D";
        functionOrArray.selector = "0xdeadbeef";
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [functionOrArray],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint8[]");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Prefers numbers to strings", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, ["256"], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint256");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000100"
        );
      });
    });

    describe("Array priority", () => {
      let abis: Abi.FunctionEntry[];
      beforeAll(() => {
        abis = <Abi.FunctionEntry[]>(
          Abi.normalize(artifacts.TestContract.abi).filter(
            entry =>
              entry.type === "function" && entry.name === "overloadedArray"
          )
        );
      });

      it("Prefers static length to dynamic length", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [[256, 256]], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint256[2]");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100"
        );
      });

      it("Prefers more specific base type", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [[1]], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint8[]");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Falls back on less specific type if necessary", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [[256]], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint256[]");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000100"
        );
      });

      it("Rejects if no unique best overload", async () => {
        try {
          await encoder.resolveAndEncode(abis, [[1, 1]], {
            allowOptions: true
          });
          assert.fail("Should reject if no unique best");
        } catch (error) {
          if (error.name !== "NoUniqueBestOverloadError") {
            throw error;
          }
        }
      });
    });

    describe("Struct priority", () => {
      let abis: Abi.FunctionEntry[];
      beforeAll(() => {
        abis = <Abi.FunctionEntry[]>(
          Abi.normalize(artifacts.TestContract.abi).filter(
            entry =>
              entry.type === "function" && entry.name === "overloadedStruct"
          )
        );
      });

      it("Prefers more specific components to less specific components", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [{ x: 1, y: 256 }],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "tuple");
        assert.lengthOf(<Abi.Parameter[]>abi.inputs[0].components, 2);
        assert.strictEqual(
          (<Abi.Parameter[]>abi.inputs[0].components)[0].type,
          "uint8"
        );
        assert.strictEqual(
          (<Abi.Parameter[]>abi.inputs[0].components)[1].type,
          "uint256"
        );
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000100"
        );
      });

      it("Falls back on less specific type if necessary", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          [{ x: 256, y: 256 }],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "tuple");
        assert.lengthOf(<Abi.Parameter[]>abi.inputs[0].components, 2);
        assert.strictEqual(
          (<Abi.Parameter[]>abi.inputs[0].components)[0].type,
          "uint256"
        );
        assert.strictEqual(
          (<Abi.Parameter[]>abi.inputs[0].components)[1].type,
          "uint256"
        );
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100"
        );
      });

      it("Rejects if no unique best overload", async () => {
        try {
          await encoder.resolveAndEncode(abis, [{ x: 1, y: 1 }], {
            allowOptions: true
          });
          assert.fail("Should reject if no unique best");
        } catch (error) {
          if (error.name !== "NoUniqueBestOverloadError") {
            throw error;
          }
        }
      });
    });

    describe("Multiple argument priority", () => {
      let abis: Abi.FunctionEntry[];
      beforeAll(() => {
        abis = <Abi.FunctionEntry[]>(
          Abi.normalize(artifacts.TestContract.abi).filter(
            entry =>
              entry.type === "function" && entry.name === "overloadedMulti"
          )
        );
      });

      it("Prefers more specific components to less specific components", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [1, 256], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 2);
        assert.strictEqual(abi.inputs[0].type, "uint8");
        assert.strictEqual(abi.inputs[1].type, "uint256");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000100"
        );
      });

      it("Falls back on less specific type if necessary", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [256, 256], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 2);
        assert.strictEqual(abi.inputs[0].type, "uint256");
        assert.strictEqual(abi.inputs[1].type, "uint256");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100"
        );
      });

      it("Rejects if no unique best overload", async () => {
        try {
          await encoder.resolveAndEncode(abis, [1, 1], { allowOptions: true });
          assert.fail("Should reject if no unique best");
        } catch (error) {
          if (error.name !== "NoUniqueBestOverloadError") {
            throw error;
          }
        }
      });
    });

    describe("Bytes priority", () => {
      let abis: Abi.FunctionEntry[];
      beforeAll(() => {
        abis = <Abi.FunctionEntry[]>(
          Abi.normalize(artifacts.TestContract.abi).filter(
            entry =>
              entry.type === "function" && entry.name === "overloadedBytes"
          )
        );
      });

      it("Prefers shorter length to longer length", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, ["0xff"], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "bytes1");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Prefers static to dynamic", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, ["0xf00f"], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "bytes4");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "f00f000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Falls back on dynamic if necessary", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(
          abis,
          ["0x0123456789abcdef"],
          { allowOptions: true }
        );
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "bytes");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000080123456789abcdef000000000000000000000000000000000000000000000000"
        );
      });
    });

    describe("Numeric priority", () => {
      let abis: Abi.FunctionEntry[];
      beforeAll(() => {
        abis = <Abi.FunctionEntry[]>(
          Abi.normalize(artifacts.TestContract.abi).filter(
            entry =>
              entry.type === "function" && entry.name === "overloadedNumeric"
          )
        );
      });

      it("Prefers uint8 to int16", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [128], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "uint8");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000080"
        );
      });

      it("Prefers int8 to int16", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [-1], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "int8");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Falls back on int16 if necessary", async () => {
        const { abi, tx } = await encoder.resolveAndEncode(abis, [-129], {
          allowOptions: true
        });
        assert.lengthOf(abi.inputs, 1);
        assert.strictEqual(abi.inputs[0].type, "int16");
        const selector = Codec.AbiData.Utils.abiSelector(abi);
        assert.strictEqual(
          tx.data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f"
        );
      });

      it("Won't choose between int8 and uint8", async () => {
        try {
          await encoder.resolveAndEncode(abis, [1], { allowOptions: true });
          assert.fail("Should reject if no unique best");
        } catch (error) {
          if (error.name !== "NoUniqueBestOverloadError") {
            throw error;
          }
        }
      });
    });
  });
});
