import debugModule from "debug";
const debug = debugModule("encoder:test");

import { assert } from "chai";
import path from "path";
import fs from "fs-extra";

import * as Encoder from "..";
import * as Codec from "@truffle/codec";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import type TruffleConfig from "@truffle/config";
import * as Abi from "@truffle/abi-utils";
import Ganache from "ganache";
import type { Web3BaseProvider as Provider } from "web3-common";

import { prepareContracts } from "./helpers";

let artifacts: { [name: string]: Artifact };
let compilations: Codec.Compilations.Compilation[];
let config: TruffleConfig;
let registryAddress: string;
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

  ({ artifacts, compilations, config, registryAddress } =
    await prepareContracts(sources, addresses, provider));
}, 50000);

describe("Encoding", () => {
  describe("Addresses and contracts", () => {
    let encoder: Encoder.ContractEncoder;
    let abi: Abi.FunctionEntry;
    let selector: string;
    let contractAbi: Abi.FunctionEntry;
    let contractSelector: string;
    let contractType: Codec.Format.Types.ContractType;
    let udvtType: Codec.Format.Types.UserDefinedValueTypeType;

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
      udvtType = <Codec.Format.Types.UserDefinedValueTypeType>(
        Object.values(userDefinedTypes).find(
          type =>
            type.typeClass === "userDefinedValueType" &&
            type.typeName === "Account" &&
            type.kind === "local" &&
            type.definingContractName === "TestContract"
        )
      );
    });

    it("Encodes addresses with good checksum", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
      ]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Encodes addresses in all lowercase", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        "0x10ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      ]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Encodes addresses in all uppercase", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        "0X10CA7E901D10CA7E901D10CA7E901D10CA7E901D"
      ]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Encodes addresses without 0x prefix", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        "10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
      ]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Encodes ICAP addresses", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        "XE19HOWVEXINGLYQUICKDAFTZEBRASJUMP"
      ]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000435099d36c1e39b0718325d179e598075a395d1"
      );
    });

    it("Encodes objects with an address field", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
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

    it("Encodes callable objects with an address field", async () => {
      let input: any = () => undefined;
      input.address = "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D";
      input.garbate = "garbage";
      const { data } = await encoder.encodeTxNoResolution(abi, [input]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Encodes ENS names", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, ["locate.gold"]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Encodes contracts", async () => {
      const { data } = await encoder.encodeTxNoResolution(contractAbi, [
        "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
      ]);
      assert.strictEqual(
        data,
        contractSelector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Encodes type/value pairs (address)", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
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
      const { data } = await encoder.encodeTxNoResolution(abi, [
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Encodes wrapped UDVTs", async () => {
      const wrapped = await encoder.wrapElementaryValue(
        udvtType,
        "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
      );
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "00000000000000000000000010ca7e901d10ca7e901d10ca7e901d10ca7e901d"
      );
    });

    it("Rejects bad checksum w/ mixed-case", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, ["garbage.eth"]);
        assert.fail("Unknown ENS names should not be encoded");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects objects with a selector field", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
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
        await encoder.encodeTxNoResolution(abi, [null]);
        assert.fail("Null should not be encoded as an address");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects other input (test: undefined)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [undefined]);
        assert.fail("Undefined should not be encoded as an address");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects other input (test: {})", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [{}]);
        assert.fail("Empty object should not be encoded as an address");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects type/value pair for wrong type", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
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

    it("Rejects nested type/value pair", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
          {
            type: "address",
            value: {
              type: "address",
              value: "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
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
        { typeClass: "bytes", kind: "static", length: 20 },
        "0x10ca7e901d10CA7E901D10Ca7e901D10CA7e901D"
      );
      try {
        await encoder.encodeTxNoResolution(abi, [wrapped]);
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
        await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.fail("Error result got encoded as address");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });
  });
});
