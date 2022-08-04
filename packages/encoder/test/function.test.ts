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
      const { data } = await encoder.encodeTxNoResolution(abi, [
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

    it("Encodes callable objects w/ address & selector", async () => {
      let input: any = () => undefined;
      input.address = "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D";
      input.selector = "0xdeadbeef";
      input.garbate = "garbage";
      const { data } = await encoder.encodeTxNoResolution(abi, [input]);
      assert.strictEqual(
        data,
        selector +
          "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
      );
    });

    it("Encodes objects w/ address & selector (unusual forms for these)", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
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
      const { data } = await encoder.encodeTxNoResolution(abi, [
        "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901ddeadbeef"
      ]);
      assert.strictEqual(
        data,
        selector +
          "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
      );
    });

    it("Encodes type/value pairs", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "10ca7e901d10ca7e901d10ca7e901d10ca7e901ddeadbeef0000000000000000"
      );
    });

    it("Rejects address with bad checksum", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [null]);
        assert.fail("Null should not be encoded as a function pointer");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects other input (test: undefined)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [undefined]);
        assert.fail("Undefined should not be encoded as a function pointer");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects type/value pair with wrong type", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
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

    it("Rejects nested type/value pair", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
          {
            type: "function",
            value: {
              type: "function",
              value: {
                address: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D",
                selector: "0xdeadbeef"
              }
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
        await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.fail("Error result got encoded as function");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });
  });
});
