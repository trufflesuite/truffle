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
      const { data } = await encoder.encodeTxNoResolution(abi, ["ABC"]);
      assert.strictEqual(
        data,
        selector +
          "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes boxed strings", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003a1a1a10000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes Uint8Arrays with valid UTF-8", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new Uint8Array([0x41, 0x42, 0x43])
      ]);
      assert.strictEqual(
        data,
        selector +
          "000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes Uint8Arrays with malformed UTF-8", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new Uint8Array([0xa1, 0xa1, 0xa1])
      ]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003a1a1a10000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes type/value pair", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(
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
        await encoder.encodeTxNoResolution(abi, [null]);
        assert.fail("Null should not be encoded as a string");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects non-string things (test: undefined)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [undefined]);
        assert.fail("Undefined should not be encoded as a string");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects non-string things (test: {})", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [{}]);
        assert.fail("Empty object should not be encoded as a string");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects type/value pair for wrong type", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [{ type: "uint", value: "1" }]);
        assert.fail("Value specified as uint got encoded as string");
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

    it("Rejects wrapped value for wrong type", async () => {
      const wrapped = await encoder.wrapElementaryValue(
        { typeClass: "uint", bits: 256 },
        "1"
      );
      try {
        await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.fail("Error result got encoded as string");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });
  });
});
