import debugModule from "debug";
const debug = debugModule("encoder:test");

import { assert } from "chai";
import * as path from "path";
import * as fs from "fs-extra";

import * as Encoder from "..";
import * as Codec from "@truffle/codec";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import * as Abi from "@truffle/abi-utils";
import Ganache from "ganache";

import * as BN from "bn.js";
import BigNumber from "bignumber.js";
import Big from "big.js";
import {
  BigNumber as EthersBigNumber,
  FixedNumber
} from "@ethersproject/bignumber";

import { prepareContracts } from "./helpers";
import { Web3BaseProvider } from "web3-types";

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
  const provider = Ganache.provider({
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
  }) as unknown as Web3BaseProvider;

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
  describe("Integers and enums", () => {
    let encoder: Encoder.ContractEncoder;
    let enumType: Codec.Format.Types.EnumType;
    let alternateEnumType: Codec.Format.Types.EnumType;
    let shortEnumType: Codec.Format.Types.EnumType;
    let udvtType: Codec.Format.Types.UserDefinedValueTypeType;

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
      udvtType = <Codec.Format.Types.UserDefinedValueTypeType>(
        Object.values(userDefinedTypes).find(
          type =>
            type.typeClass === "userDefinedValueType" &&
            type.typeName === "Natural" &&
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
        const { data } = await encoder.encodeTxNoResolution(abi, [1]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes negative numbers", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [-1]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes boxed numbers", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Number(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes bigints", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [BigInt(1)]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes negative bigints", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [BigInt(-1)]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes BNs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [new BN(1)]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes negative BNs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [new BN(-1)]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes Bigs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [new Big(1)]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes negative Bigs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Big("-1")
        ]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes BigNumbers (MikeMcl)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new BigNumber(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes negative BigNumbers (MikeMcl)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new BigNumber(-1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes BigNumbers (ethers)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          EthersBigNumber.from(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes negative BigNumbers (ethers)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          EthersBigNumber.from(-1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes FixedNumbers", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          FixedNumber.from(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes negative FixedNumbers", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          FixedNumber.from(-1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes numeric strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 1 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes negative numeric strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -1 "]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes numeric strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 1_1 "]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000000b"
        );
      });

      it("Encodes hexadecimal strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0xa "]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000000a"
        );
      });

      it("Encodes hexadecimal strings (uppercase)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0XA "]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000000a"
        );
      });

      it("Encodes negated hexadecimal strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -0xa "]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6"
        );
      });

      it("Encodes hexadecimal strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0x7_f "]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000007f"
        );
      });

      it("Encodes negated hexadecimal strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -0x8_0 "]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80"
        );
      });

      it("Encodes octal strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0o10 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000008"
        );
      });

      it("Encodes negated octal strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -0o10 "]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8"
        );
      });

      it("Encodes octal strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0o1_0 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000008"
        );
      });

      it("Encodes negated octal strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -0o1_0 "]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8"
        );
      });

      it("Encodes binary strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0b10 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes negated binary strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -0b10 "]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe"
        );
      });

      it("Encodes binary strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0b1_0 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes negated binary strings with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -0b1_0 "]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe"
        );
      });

      it("Encodes scientific notation", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -1e0 "]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes scientific notation with underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          " -1_0e-0_1 "
        ]);
        assert.strictEqual(
          data,
          selector +
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );
      });

      it("Encodes numeric strings with units", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 2 wei "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes numeric strings with units and underscores", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 1_0 wei "]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000000a"
        );
      });

      it("Encodes numeric strings with units (no space)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 2wei "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes numeric strings with units and underscores (no space)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 1_0wei "]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000000000000a"
        );
      });

      it("Encodes negative numeric strings with units", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" -2 wei "]);
        assert.strictEqual(
          data,
          selector +
            "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe"
        );
      });

      it("Encodes numeric strings that are units", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" wei "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes boxed numeric strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new String(" 1 ")
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes Uint8Arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Uint8Array([1])
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes Uint8Array-likes", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { length: 1, 0: 1, garbage: "garbage" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes type/value pairs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes wrapped enum values", async () => {
        const wrapped = await encoder.wrapElementaryValue(enumType, 1);
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000010"
        );
      });

      it("Encodes wrapped UDVT values (integer)", async () => {
        const wrapped = await encoder.wrapElementaryValue(udvtType, 1);
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Rejects out-of-range input (number, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [128]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (number, negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [-129]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (string, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["128"]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (string, negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["-129"]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (bigint, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [BigInt(128)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (bigint, negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [BigInt(-129)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BN, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BN(128)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BN, negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BN(-129)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Big, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Big(128)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Big, negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Big(-129)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BigNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(128)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BigNumber, negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(-129)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers BigNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [EthersBigNumber.from(128)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers BigNumber, negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [EthersBigNumber.from(-129)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers FixedNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [FixedNumber.from(128)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers FixedNumber, negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [FixedNumber.from(-129)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Uint8Array)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Uint8Array([128])]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-finite input (number)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [NaN]);
          assert.fail("Non-finite input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-finite input (BigNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(NaN)]);
          assert.fail("Non-finite input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (number)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [1.5]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (string)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["1.5"]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (Big)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Big(1.5)]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (BigNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(1.5)]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (Ethers FixedNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [FixedNumber.from("1.5")]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects just whitespace", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [" "]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bare minus sign", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["-"]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects double negatives", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["--0"]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects double minus sign", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["--"]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects unrecognized unit", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["2 kwei"]);
          assert.fail("Unrecognized unit got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects invalid hexadecimal", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0xg"]);
          assert.fail("Bad hexadecimal got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects invalid octal", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0xo"]);
          assert.fail("Bad octal got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects invalid binary", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0b2"]);
          assert.fail("Bad binary got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects consecutive underscores", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["1__1"]);
          assert.fail("Consecutive underscores should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects consecutive underscores (hex)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0x1__1"]);
          assert.fail("Consecutive underscores should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects underscore after minus sign", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["-_1"]);
          assert.fail("Misplaced underscore got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects underscore after hex prefix", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0x_1"]);
          assert.fail("Misplaced underscore got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects underscore after octal prefix", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0o_1"]);
          assert.fail("Misplaced underscore got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects underscore after binary prefix", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0b_1"]);
          assert.fail("Misplaced underscore got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects underscore inbetween mantissa and e", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["1_e1"]);
          assert.fail("Misplaced underscore got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects underscore inbetween e and exponent", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["1e_1"]);
          assert.fail("Misplaced underscore got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects underscore inbetween number and unit", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["10_wei"]);
          assert.fail("Misplaced underscore got accepted");
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

      it("Rejects other non-numeric strings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["garbage"]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other non-numeric input (test: null)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [null]);
          assert.fail("Null should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other non-numeric input (test: undefined)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other non-numeric input (test: {})", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{}]);
          assert.fail("Empty object should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type (string)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
            { type: "int", value: "1" }
          ]);
          assert.fail("Value specified as int got encoded as int8");
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
              type: "int8",
              value: {
                type: "int8",
                value: "1"
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
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "bool" },
          true
        );
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
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
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Error result (of general sort) got encoded as integer");
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
          await encoder.encodeTxNoResolution(abi, [256]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (number)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [-1]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (string, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["256"]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (string)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["-1"]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (bigint, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [BigInt(256)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (bigint)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [BigInt(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BN, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BN(256)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (BN)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BN(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Big, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Big(256)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (Big)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Big(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BigNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(256)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (BigNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers BigNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [EthersBigNumber.from(256)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (Ethers BigNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [EthersBigNumber.from(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers FixedNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [FixedNumber.from(256)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (Ethers FixedNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [FixedNumber.from(-1)]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [" 16 gwei "]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000003b9aca000"
        );
      });

      it("Encodes values that are units", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" gwei "]);
        assert.strictEqual(
          data,
          selector +
            "000000000000000000000000000000000000000000000000000000003b9aca00"
        );
      });

      it("Encodes Uint8Arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Uint8Array([1, 255])
        ]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000001ff"
        );
      });

      it("Encodes type/value pairs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { type: "int256", value: "1" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes type/value pairs (short form)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Rejects unsafe integer input (positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [2 ** 53]);
          assert.fail("Unsafe input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects unsafe integer input (negative)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [-(2 ** 53)]);
          assert.fail("Unsafe input should cause exception");
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

      it("Rejects type/value pair for wrong type (int8)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
            { type: "uint", value: "1" }
          ]);
          assert.fail("Value specified as uint got encoded as int");
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
              type: "int",
              value: {
                type: "int",
                value: "1"
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
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { type: "uint256", value: "1" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes type/value pairs (short form)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Rejects type/value pair for wrong type (uint8)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
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
          await encoder.encodeTxNoResolution(abi, [
            { type: "int", value: "1" }
          ]);
          assert.fail("Value specified as int got encoded as uint");
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
              type: "uint",
              value: {
                type: "uint",
                value: "1"
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
        const { data } = await encoder.encodeTxNoResolution(abi, [1]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes boxed numbers", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Number(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes bigints", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [BigInt(1)]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes BNs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [new BN(1)]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes Bigs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [new Big(1)]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes BigNumbers (MikeMcl)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new BigNumber(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes BigNumbers (ethers)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          EthersBigNumber.from(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes FixedNumbers", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          FixedNumber.from(1)
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes numeric strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 1 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes hexadecimal strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0x1 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes octal strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0o1 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes binary strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 0b1 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes scientific notation", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 1e0 "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes numeric strings with units", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 2 wei "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes numeric strings with units (no space)", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" 2wei "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes numeric strings that are units", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [" wei "]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes enum option names", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, ["Red"]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000004"
        );
      });

      it("Encodes enum option names with specified enum", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, ["Color.Red"]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000004"
        );
      });

      it("Encodes enum option names with specified enum & contract", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          "TestContract.Color.Red"
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000004"
        );
      });

      it("Encodes global enum option names", async () => {
        const { data } = await encoder.encodeTxNoResolution(globalAbi, ["Red"]);
        assert.strictEqual(
          data,
          globalSelector +
            "0000000000000000000000000000000000000000000000000000000000000006"
        );
      });

      it("Encodes global enum option names with specified enum", async () => {
        const { data } = await encoder.encodeTxNoResolution(globalAbi, [
          "GlobalColor.Red"
        ]);
        assert.strictEqual(
          data,
          globalSelector +
            "0000000000000000000000000000000000000000000000000000000000000006"
        );
      });

      it("Encodes boxed strings", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new String(" 1 ")
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes Uint8Arrays", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          new Uint8Array([1])
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes Uint8Array-likes", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { length: 1, 0: 1, garbage: "garbage" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes type/value pairs", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
          { type: "enum", value: "1" }
        ]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes type/value pairs using underlying uint type", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes wrapped enum values (same)", async () => {
        const wrapped = await encoder.wrapElementaryValue(enumType, 1);
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes wrapped enum values (different)", async () => {
        const wrapped = await encoder.wrapElementaryValue(alternateEnumType, 1);
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("Encodes wrapped UDVT values (integer)", async () => {
        const wrapped = await encoder.wrapElementaryValue(udvtType, 1);
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000007"
        );
      });

      it("Rejects out-of-range input (number, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [8]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (number)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [-1]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (string, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["8"]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (string)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["-1"]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (bigint, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [BigInt(8)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (bigint)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [BigInt(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BN, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BN(8)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (BN)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BN(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Big, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Big(8)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (Big)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Big(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (BigNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(8)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (BigNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers BigNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [EthersBigNumber.from(8)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (Ethers BigNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [EthersBigNumber.from(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects out-of-range input (Ethers FixedNumber, positive)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [FixedNumber.from(8)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects negative input (Ethers FixedNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [FixedNumber.from(-1)]);
          assert.fail("Out-of-range input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-finite input (number)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [NaN]);
          assert.fail("Non-finite input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-finite input (BigNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(NaN)]);
          assert.fail("Non-finite input should cause exception");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (number)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [1.5]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (string)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["1.5"]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (Big)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new Big(1.5)]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (BigNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [new BigNumber(1.5)]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects non-integer input (Ethers FixedNumber)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [FixedNumber.from("1.5")]);
          assert.fail("Non-integer input should be rejected");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects just whitespace", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [" "]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects bare minus sign", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["-"]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects double negatives", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["--0"]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects double minus sign", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["--"]);
          assert.fail("Non-numeric string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects unrecognized unit", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["2 kwei"]);
          assert.fail("Unrecognized unit got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects invalid hexadecimal", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0xg"]);
          assert.fail("Bad hexadecimal got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects invalid octal", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0xo"]);
          assert.fail("Bad octal got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects invalid binary", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["0b2"]);
          assert.fail("Bad binary got accepted");
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

      it("Rejects options with whitespace", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [" Red "]);
          assert.fail("Option with whitespace accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects options for wrong enum", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["Short"]);
          assert.fail("Option for wrong enum accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects option with wrong enum specified", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["MinusColor.Red"]);
          assert.fail("Option for wrong enum accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects option with wrong contract specified", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["AuxContract.Color.Red"]);
          assert.fail("Option for wrong contract accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other strings", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, ["garbage"]);
          assert.fail("Non-numeric, non-option string got accepted");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: null)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [null]);
          assert.fail("Null should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: undefined)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [undefined]);
          assert.fail("Undefined should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects other input (test: {})", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [{}]);
          assert.fail("Empty object should not be encoded as a number");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects type/value pair for wrong type (uint16)", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [
            { type: "uint16", value: "1" }
          ]);
          assert.fail("Value specified as uint16 got encoded as uint8 enum");
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
              type: "enum",
              value: {
                type: "enum",
                value: "1"
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
        const wrapped = await encoder.wrapElementaryValue(
          { typeClass: "bool" },
          true
        );
        try {
          await encoder.encodeTxNoResolution(abi, [wrapped]);
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
          await encoder.encodeTxNoResolution(abi, [wrapped]);
          assert.fail("Error result (of general sort) got encoded as integer");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });
    });
  });
});
