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

describe("Overload resolution", () => {
  let encoder: Encoder.ContractEncoder;
  beforeAll(async () => {
    encoder = await Encoder.forArtifact(artifacts.TestContract, {
      projectInfo: { compilations }
    });
  });

  it("Throws correct error when no function by that name", async () => {
    try {
      await encoder.encodeTransaction("doesNotExist", []);
      assert.fail("Should reject when no function by given name");
    } catch (error) {
      if (error.name !== "NoFunctionByThatNameError") {
        throw error;
      }
    }
  });

  describe("Overall priority", () => {
    it("Prefers transaction options to arrays", async () => {
      let arrayOrOptions: any = [];
      arrayOrOptions.overwrite = true;
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
        [arrayOrOptions],
        { allowOptions: true }
      );
      assert.lengthOf(abi.inputs, 0);
      const selector = Codec.AbiData.Utils.abiSelector(abi);
      const expected = { overwrite: true, data: selector };
      assert.deepEqual(tx, expected);
    });

    it("Prefers arrays to structs and tuples", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
        [["0xff"]],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedUint8ArrayInput",
        [[1]],
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
        ["0xffff"],
        {
          allowOptions: true
        }
      );
      assert.lengthOf(abi.inputs, 1);
      assert.strictEqual(abi.inputs[0].type, "bytes32");
      const selector = Codec.AbiData.Utils.abiSelector(abi);
      assert.strictEqual(
        tx.data,
        selector +
          "ffff000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Prefers external function pointers to bools", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction("overloaded", [1], {
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
        ["Red"],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction("overloaded", [""], {
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
      const { abi, tx } = await encoder.encodeTransaction("overloaded", [{}], {
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

    it("Prefers bools to strings with strict booleans on", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
        ["true"],
        {
          allowOptions: true,
          strictBooleans: true
        }
      );
      assert.lengthOf(abi.inputs, 1);
      assert.strictEqual(abi.inputs[0].type, "bool");
      const selector = Codec.AbiData.Utils.abiSelector(abi);
      assert.strictEqual(
        tx.data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes as string as last resort with strict booleans on", async () => {
      const { abi, tx } = await encoder.encodeTransaction("overloaded", [""], {
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

    it("Treats UDVT same as underlying type (bytes1)", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
        ["0xff"],
        {
          allowOptions: true
        }
      );
      assert.lengthOf(abi.inputs, 1);
      assert.strictEqual(abi.inputs[0].type, "bytes1");
      const selector = Codec.AbiData.Utils.abiSelector(abi);
      assert.strictEqual(
        tx.data,
        selector +
          "ff00000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Rejects if no match", async () => {
      try {
        await encoder.encodeTransaction(
          "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloaded",
        ["256"],
        {
          allowOptions: true
        }
      );
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
    it("Prefers static length to dynamic length", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedArray",
        [[256, 256]],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedArray",
        [[1]],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedArray",
        [[256]],
        {
          allowOptions: true
        }
      );
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
        await encoder.encodeTransaction("overloadedArray", [[1, 1]], {
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
    it("Prefers more specific components to less specific components", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedStruct",
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedStruct",
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
        await encoder.encodeTransaction("overloadedStruct", [{ x: 1, y: 1 }], {
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
    it("Prefers more specific components to less specific components", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedMulti",
        [1, 256],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedMulti",
        [256, 256],
        {
          allowOptions: true
        }
      );
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
        await encoder.encodeTransaction("overloadedMulti", [1, 1], {
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

  describe("Bytes priority", () => {
    it("Prefers shorter length to longer length", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedBytes",
        ["0xff"],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedBytes",
        ["0xf00f"],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedBytes",
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
    it("Prefers uint8 to int16", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedNumeric",
        [128],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedNumeric",
        [-1],
        {
          allowOptions: true
        }
      );
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
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedNumeric",
        [-129],
        {
          allowOptions: true
        }
      );
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
        await encoder.encodeTransaction("overloadedNumeric", [1], {
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

  describe("Overload resolution and loose matching", () => {
    it("Rejects loose matches for structs when resolving overloads", async () => {
      try {
        await encoder.encodeTransaction(
          "overloadedAmbiguous",
          [{ x: "0xff", y: 1, garbage: "garbage" }],
          { allowOptions: true }
        );
        assert.fail("Should reject loose matches for structs");
      } catch (error) {
        if (error.name !== "NoOverloadsMatchedError") {
          throw error;
        }
      }
    });

    it("Rejects loose matches for options when resolving overloads", async () => {
      try {
        await encoder.encodeTransaction(
          "overloadedAmbiguous",
          [{ type: "fixed", value: "1" }],
          { allowOptions: true }
        );
        assert.fail("Should reject loose matches for options");
      } catch (error) {
        if (error.name !== "NoOverloadsMatchedError") {
          throw error;
        }
      }
    });

    it("Allows loose matches when length disambiguates", async () => {
      const { abi, tx } = await encoder.encodeTransaction(
        "overloadedUnambiguous",
        [{ x: "0xff", y: 1, garbage: "garbage" }],
        { allowOptions: false } //turning this off makes the length sufficient
      );
      assert.lengthOf(abi.inputs, 1);
      assert.strictEqual(abi.inputs[0].type, "tuple");
      assert.lengthOf(<Abi.Parameter[]>abi.inputs[0].components, 2);
      assert.strictEqual(
        (<Abi.Parameter[]>abi.inputs[0].components)[0].type,
        "bytes1"
      );
      assert.strictEqual(
        (<Abi.Parameter[]>abi.inputs[0].components)[1].type,
        "uint8"
      );
      const selector = Codec.AbiData.Utils.abiSelector(abi);
      assert.strictEqual(
        tx.data,
        selector +
          "ff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
      );
    });
  });

  describe("Manual overload resolution by signature", () => {
    it("Allows specifying functions by signature", async () => {
      const { abi, tx } = await encoder.encodeTransaction("overloaded(bool)", [
        1
      ]);
      assert.lengthOf(abi.inputs, 1);
      assert.strictEqual(abi.inputs[0].type, "bool");
      const selector = Codec.AbiData.Utils.abiSelector(abi);
      assert.strictEqual(
        tx.data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Rejects when no overload matches specified signature", async () => {
      try {
        await encoder.encodeTransaction("overloaded(uint192)", [1]);
        assert.fail("Should reject when specified signature does not exist");
      } catch (error) {
        if (error.name !== "NoFunctionByThatNameError") {
          throw error;
        }
      }
    });
  });
});
