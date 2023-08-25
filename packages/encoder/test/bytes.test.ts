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

import BN from "bn.js";
import Big from "big.js";
import {
  BigNumber as EthersBigNumber,
  FixedNumber
} from "@ethersproject/bignumber";

import { prepareContracts } from "./helpers";

let artifacts: { [name: string]: Artifact };
let compilations: Codec.Compilations.Compilation[];
const addresses: { [name: string]: string } = {
  "locate.gold": "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
};

beforeAll(async () => {
  //prepare contracts and artifacts

  const provider = Ganache.provider({
    logging: {
      quiet: true
    },
    wallet: {
      seed: "encoder"
    },
    miner: {
      //note: we should ideally set strict here, but that causes a test
      //failure in the ENS testing; we should figure out what's up with
      //that so we can set strict
      instamine: "eager",
      blockGasLimit: 7000000
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
        const { data } = await encoder.encodeTxNoResolution(abi, [
          "0xDeAdBeEf"
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes hex strings (0X)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          "0XDeAdBeEf"
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes hex strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          "0xDe_Ad_Be_Ef"
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes hex strings with mid-byte underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          "0xD_e_A_d_B_e_E_f"
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed hex strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new String("0xDeAdBeEf")
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes type/value pair", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { type: "bytes", value: "0xDeAdBeEf" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes Uint8Arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Uint8Array([0, 1, 255])
        ]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000030001ff0000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes Uint8Array-likes", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { length: 3, 0: 0, 1: 1, 2: 255, garbage: "garbage" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000030001ff0000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes text as UTF-8", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Rejects hex strings without 0x prefix", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["ff"]);
          assert.fail("Unprefixed hex strings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects hex strings with consecutive underscores", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0xdead__beef"]);
          assert.fail(
            "Hex strings with consecutive underscores should be rejected"
          );
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects hex strings with misplaced underscores", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0x_deadbeef"]);
          assert.fail(
            "Hex strings with underscores not between digits should be rejected"
          );
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other strings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["xyz"]);
          assert.fail("Non-hex strings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-utf8 encodings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 256 }]);
          assert.fail("Accepted byte above 255");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: -1 }]);
          assert.fail("Accepted negative byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects fractional bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 0.5 }]);
          assert.fail("Accepted fractional byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-numeric bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            { length: 1, 0: "garbage" }
          ]);
          assert.fail("Accepted non-numeric byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects fractional length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 0.5 }]);
          assert.fail("Accepted fractional length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: -1 }]);
          assert.fail("Accepted negative length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects unsafely large length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 1e100 }]);
          assert.fail("Accepted unsafely large length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-numeric length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: "garbage" }]);
          assert.fail("Accepted non-numeric length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type (string)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
            { type: "bytes32", value: "0xDeAdBeEf" }
          ]);
          assert.fail("Accepted type/value pair for wrong type");
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
              type: "bytes",
              value: {
                type: "bytes",
                value: "0xdeadbeef"
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

      it("Rejects non-bytesring things (test: null)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [null]);
          assert.fail("Null should not be encoded as a bytestring");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-bytestring things (test: undefined)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a bytestring");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-bytestring things (test: {})", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{}]);
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
          await encoder.encodeTxNoResolution(abi, [wrapped]);
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
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Error result got encoded as bytestring");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      describe("Loose-mode numeric input", () => {
        //disallows:
        //all of the above outside loose mode
        //negatives
        //non-integers
        it("Encodes odd-length hex strings in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, ["0xf"]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes decimal strings in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, ["15"]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes boxed decimal strings in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            new String("15")
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes numbers in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [15]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes boxed numbers in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            new Number(15)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes bigints in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            BigInt(15)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes BNs in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            new BN(15)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes Bigs in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            new Big(15)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes ethers BigNumbers in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            EthersBigNumber.from(15)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes ethers FixedNumbers in loose mode", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            FixedNumber.from(15)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes zero (as string) ethers-compatibly (length 1) (length 1)", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, ["0"]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes zero (as number) ethers-compatibly (length 1)", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [0]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes zero (as bigint) ethers-compatibly (length 1)", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [BigInt(0)]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes zero (as BN) ethers-compatibly (length 1)", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [new BN(0)]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes zero (as Big) ethers-compatibly (length 1)", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            new Big(0)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes zero (as ethers BigNumber) ethers-compatibly (length 1)", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            EthersBigNumber.from(0)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Encodes zero (as ethers FixedNumber) ethers-compatibly (length 1)", async () => {
          const { data } = await encoder.encodeTxNoResolution(abi, [
            FixedNumber.from(0)
          ]);
          assert.strictEqual(
            data,
            selector +
              "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("Rejects negative numeric string", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, ["-1"]);
            assert.fail("Negative number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer numeric string", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, ["1.5"]);
            assert.fail("Fractional number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative number", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [-1]);
            assert.fail("Negative number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer number", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [1.5]);
            assert.fail("Fractional number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects unsafe integer", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [2 ** 53]);
            assert.fail("Unsafe number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative bigint", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [BigInt(-1)]);
            assert.fail("Negative number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative BN", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [new BN(-1)]);
            assert.fail("Negative number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative ethers BigNumber", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [EthersBigNumber.from(-1)]);
            assert.fail("Negative number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative Big", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [new Big(-1)]);
            assert.fail("Negative number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer Big", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [new Big(1.5)]);
            assert.fail("Fractional number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects negative FixedNumber", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [FixedNumber.from(-1)]);
            assert.fail("Negative number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects non-integer FixedNumber", async () => {
          try {
            await encoder.encodeTxNoResolution(abi, [FixedNumber.from("1.5")]);
            assert.fail("Fractional number got encoded as bytestring");
          } catch (error) {
            if (error.name !== "TypeMismatchError") {
              throw error;
            }
          }
        });

        it("Rejects odd-length hex string outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", ["0xf"]);
            assert.fail(
              "Odd-length hex string got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects decimal input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", ["1"]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects boxed decimal input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [
              new String("1")
            ]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects number input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [1]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects boxed number input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [
              new Number(1)
            ]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects bigint input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [BigInt(1)]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects bigint input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [BigInt(1)]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects BN input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [new BN(1)]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects Big input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [new Big(1)]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects ethers BigNumber input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [
              EthersBigNumber.from(1)
            ]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });

        it("Rejects ethers FixedNumber input outside loose mode", async () => {
          try {
            await encoder.encodeTransaction("takesBytesOrArray", [
              FixedNumber.from(1)
            ]);
            assert.fail(
              "Numeric input got encoded as bytestring outside loose mode"
            );
          } catch (error) {
            if (error.name !== "NoOverloadsMatchedError") {
              throw error;
            }
          }
        });
      });
    });

    describe("Static-length (long)", () => {
      let abi: Abi.FunctionEntry;
      let selector: string;
      let udvtType: Codec.Format.Types.UserDefinedValueTypeType;

      beforeAll(() => {
        abi = <Abi.FunctionEntry>(
          Abi.normalize(artifacts.TestContract.abi).find(
            entry => entry.type === "function" && entry.name === "takesBytes32"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
        const userDefinedTypes = encoder
          .getProjectEncoder()
          .getUserDefinedTypes();
        udvtType = <Codec.Format.Types.UserDefinedValueTypeType>(
          Object.values(userDefinedTypes).find(
            type =>
              type.typeClass === "userDefinedValueType" &&
              type.typeName === "Octet" &&
              type.kind === "local" &&
              type.definingContractName === "TestContract"
          )
        );
      });

      it("Encodes hex strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          "0xDeAdBeEf"
        ]);
        assert.strictEqual(
          data,
          selector +
            "deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes hex strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          "0xDe_Ad_Be_Ef"
        ]);
        assert.strictEqual(
          data,
          selector +
            "deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes hex strings with mid-byte underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          "0xD_e_A_d_B_e_E_f"
        ]);
        assert.strictEqual(
          data,
          selector +
            "deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed hex strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new String("0xDeAdBeEf")
        ]);
        assert.strictEqual(
          data,
          selector +
            "deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes type/value pair", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { type: "bytes32", value: "0xDeAdBeEf" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes Uint8Arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Uint8Array([0, 1, 255])
        ]);
        assert.strictEqual(
          data,
          selector +
            "0001ff0000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes Uint8Array-likes", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { length: 3, 0: 0, 1: 1, 2: 255, garbage: "garbage" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0001ff0000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes text as UTF-8", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "deadbeef00000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes wrapped UDVTs overlying bytestrings", async () => {
        const wrapped = await encoder.wrapElementaryValue(udvtType, "0xff");
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Rejects odd-length hex strings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0xa"]);
          assert.fail("Odd-length hex strings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects hex strings without 0x prefix", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["01"]);
          assert.fail("Unprefixed hex strings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects overlong bytestrings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, ["abc"]);
          assert.fail("Non-hex strings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-utf8 encodings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 256 }]);
          assert.fail("Accepted byte above 255");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: -1 }]);
          assert.fail("Accepted negative byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects fractional bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 0.5 }]);
          assert.fail("Accepted fractional byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-numeric bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            { length: 1, 0: "garbage" }
          ]);
          assert.fail("Accepted non-numeric byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects fractional length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 0.5 }]);
          assert.fail("Accepted fractional length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: -1 }]);
          assert.fail("Accepted negative length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-numeric length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: "garbage" }]);
          assert.fail("Accepted non-numeric length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type (string)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
            { type: "byte", value: "0xDeAdBeEf" }
          ]);
          assert.fail("Accepted type/value pair for wrong type");
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
              type: "bytes32",
              value: {
                type: "bytes32",
                value: "0xdeadbeef"
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

      it("Rejects non-bytesring things (test: null)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [null]);
          assert.fail("Null should not be encoded as a bytestring");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-bytestring things (test: undefined)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a bytestring");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-bytestring things (test: {})", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{}]);
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
          await encoder.encodeTxNoResolution(abi, [wrapped]);
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
          await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, ["0xFf"]);
        assert.strictEqual(
          data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes boxed hex strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new String("0xFf")
        ]);
        assert.strictEqual(
          data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes type/value pair", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { type: "byte", value: "0xFf" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes Uint8Arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Uint8Array([255])
        ]);
        assert.strictEqual(
          data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes Uint8Array-likes", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { length: 1, 0: 255, garbage: "garbage" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Encodes text as UTF-8", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "ff00000000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("Rejects odd-length hex strings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0xa"]);
          assert.fail("Odd-length hex strings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects hex strings without 0x prefix", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["01"]);
          assert.fail("Unprefixed hex strings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects overlong bytestrings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0xffff"]);
          assert.fail("Overlong bytesrings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other strings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["a"]);
          assert.fail("Non-hex strings should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-utf8 encodings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 256 }]);
          assert.fail("Accepted byte above 255");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: -1 }]);
          assert.fail("Accepted negative byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects fractional bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 1, 0: 0.5 }]);
          assert.fail("Accepted fractional byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-numeric bytes", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            { length: 1, 0: "garbage" }
          ]);
          assert.fail("Accepted non-numeric byte");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects fractional length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: 0.5 }]);
          assert.fail("Accepted fractional length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: -1 }]);
          assert.fail("Accepted negative length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-numeric length", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{ length: "garbage" }]);
          assert.fail("Accepted non-numeric length");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type (string)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
            { type: "bytes32", value: "0xDeAdBeEf" }
          ]);
          assert.fail("Accepted type/value pair for wrong type");
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
              type: "bytes1",
              value: {
                type: "bytes1",
                value: "0xff"
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

      it("Rejects non-bytesring things (test: null)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [null]);
          assert.fail("Null should not be encoded as a bytestring");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-bytestring things (test: undefined)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a bytestring");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-bytestring things (test: {})", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{}]);
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
          await encoder.encodeTxNoResolution(abi, [wrapped]);
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
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Error result got encoded as bytestring");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });
  });
});
