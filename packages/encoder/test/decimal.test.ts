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
import BigNumber from "bignumber.js";
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
  describe("Decimals", () => {
    //note: this one uses the Vyper contract!
    let encoder: Encoder.ContractEncoder;
    let abi: Abi.FunctionEntry;
    let selector: string;
    let enumType: Codec.Format.Types.EnumType;
    let udvtType: Codec.Format.Types.UserDefinedValueTypeType;

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
      udvtType = <Codec.Format.Types.UserDefinedValueTypeType>(
        Object.values(userDefinedTypes).find(
          type =>
            type.typeClass === "userDefinedValueType" &&
            type.typeName === "Ether" &&
            type.kind === "local" &&
            type.definingContractName === "TestContract"
        )
      );
    });

    it("Encodes numbers", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [0.1]);
      assert.strictEqual(
        data,
        selector +
          "000000000000000000000000000000000000000000000000000000003b9aca00"
      );
    });

    it("Encodes negative numbers", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [-0.1]);
      assert.strictEqual(
        data,
        selector +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
      );
    });

    it("Encodes boxed numbers", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new Number(0.1)
      ]);
      assert.strictEqual(
        data,
        selector +
          "000000000000000000000000000000000000000000000000000000003b9aca00"
      );
    });

    it("Encodes bigints", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [BigInt(1)]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000000000000000000000000000000000002540be400"
      );
    });

    it("Encodes negative bigints", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [BigInt(-1)]);
      assert.strictEqual(
        data,
        selector +
          "fffffffffffffffffffffffffffffffffffffffffffffffffffffffdabf41c00"
      );
    });

    it("Encodes BNs", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [new BN(1)]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000000000000000000000000000000000002540be400"
      );
    });

    it("Encodes negative BNs", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [new BN(-1)]);
      assert.strictEqual(
        data,
        selector +
          "fffffffffffffffffffffffffffffffffffffffffffffffffffffffdabf41c00"
      );
    });

    it("Encodes Bigs", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [new Big(".1")]);
      assert.strictEqual(
        data,
        selector +
          "000000000000000000000000000000000000000000000000000000003b9aca00"
      );
    });

    it("Encodes negative Bigs", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new Big("-.1")
      ]);
      assert.strictEqual(
        data,
        selector +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
      );
    });

    it("Encodes BigNumbers (MikeMcl)", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new BigNumber(".1")
      ]);
      assert.strictEqual(
        data,
        selector +
          "000000000000000000000000000000000000000000000000000000003b9aca00"
      );
    });

    it("Encodes negative BigNumbers (MikeMcl)", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new BigNumber("-.1")
      ]);
      assert.strictEqual(
        data,
        selector +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
      );
    });

    it("Encodes BigNumbers (ethers)", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        EthersBigNumber.from(1)
      ]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000000000000000000000000000000000002540be400"
      );
    });

    it("Encodes negative BigNumbers (ethers)", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        EthersBigNumber.from(-1)
      ]);
      assert.strictEqual(
        data,
        selector +
          "fffffffffffffffffffffffffffffffffffffffffffffffffffffffdabf41c00"
      );
    });

    it("Encodes FixedNumbers", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        FixedNumber.from(".1")
      ]);
      assert.strictEqual(
        data,
        selector +
          "000000000000000000000000000000000000000000000000000000003b9aca00"
      );
    });

    it("Encodes negative FixedNumbers", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        FixedNumber.from("-.1")
      ]);
      assert.strictEqual(
        data,
        selector +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
      );
    });

    it("Encodes numeric strings", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [" -.1 "]);
      assert.strictEqual(
        data,
        selector +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
      );
    });

    it("Encodes scientific notation", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [" -1e-1 "]);
      assert.strictEqual(
        data,
        selector +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
      );
    });

    it("Encodes scientific notation with underscores", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [" -1_0e-0_2 "]);
      assert.strictEqual(
        data,
        selector +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
      );
    });

    it("Encodes boxed numeric strings", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new String(" -.1 ")
      ]);
      assert.strictEqual(
        data,
        selector +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4653600"
      );
    });

    it("Encodes type/value pairs", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        { type: "fixed168x10", value: ".1" }
      ]);
      assert.strictEqual(
        data,
        selector +
          "000000000000000000000000000000000000000000000000000000003b9aca00"
      );
    });

    it("Encodes type/value pairs w/decimal alias", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        { type: "decimal", value: ".1" }
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000000000000000000000000000000000002540be400"
      );
    });

    it("Encodes wrapped enum values", async () => {
      const wrapped = await encoder.wrapElementaryValue(enumType, 1);
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000000000000000000000000000000000002540be400"
      );
    });

    it("Encodes wrapped UDVT values (decimal)", async () => {
      const wrapped = await encoder.wrapElementaryValue(udvtType, "1");
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000002540be4000"
      );
    });

    it("Rejects out-of-range input (string, positive)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["1e41"]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (string, negative)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["-1e41"]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (bigint, positive)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [BigInt(10) ** BigInt(41)]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (bigint, negative)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [-(BigInt(10) ** BigInt(41))]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (BN, positive)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [new BN(10).pow(new BN(41))]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (BN, negative)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [new Big("1e41")]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (Big, negative)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [new Big("-1e41")]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (BigNumber, positive)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [new BigNumber("1e41")]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (BigNumber, negative)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [new BigNumber("-1e41")]);
        assert.fail("Out-of-range input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects out-of-range input (Ethers BigNumber, positive)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(
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
        await encoder.encodeTxNoResolution(
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
        await encoder.encodeTxNoResolution(
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
        assert.fail("Negative input for unsigned type should cause exception");
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

    it("Rejects unsafe number input (positive)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [1000000]);
        assert.fail("Unsafe input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects unsafe number input (negative)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [-1000000]);
        assert.fail("Unsafe input should cause exception");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects too-precise input (number)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [1e-11]);
        assert.fail("Too many decimal places should be rejected");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects too-precise input (string)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["1e-11"]);
        assert.fail("Too many decimal places should be rejected");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects too-precise input (Big)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [new Big("1e-11")]);
        assert.fail("Too many decimal places should be rejected");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects too-precise input (BigNumber)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [new BigNumber("1e-11")]);
        assert.fail("Too many decimal places should be rejected");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects too-precise input (Ethers FixedNumber)", async () => {
      try {
        await encoder.encodeTxNoResolution(
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
        await encoder.encodeTxNoResolution(abi, ["1 wei"]);
        assert.fail("Units not allowed on decimals");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects input that is a unit", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["wei"]);
        assert.fail("Units not allowed as decimals");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects hexadecimal input", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["0x1"]);
        assert.fail("Hex not allowed for decimals");
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

    it("Rejects consecutive underscores", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["1__0"]);
        assert.fail("Consecutive underscores should be rejected");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects underscores inbetween mantissa and e", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["1_e1"]);
        assert.fail("Misplaced underscore got accepted");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects underscores inbetween e and exponent", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["1e_1"]);
        assert.fail("Misplaced underscore got accepted");
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

    it("Rejects Uint8Arrays", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [new Uint8Array(1)]);
        assert.fail("Uint8Arrays not allowed as decimals");
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

    it("Rejects type/value pair for wrong type (int)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [{ type: "int", value: "1" }]);
        assert.fail("Value specified as int got encoded as decimal");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects type/value pair for wrong type (fixed128x18)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
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

    it("Rejects nested type/value pair", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
          {
            type: "fixed168x10",
            value: {
              type: "fixed168x10",
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
        await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.fail("Error result (of general sort) got encoded as decimal");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });
  });
});
