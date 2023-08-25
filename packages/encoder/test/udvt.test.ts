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
  describe("User-defined value types", () => {
    let encoder: Encoder.ContractEncoder;
    let abi: Abi.FunctionEntry;
    let selector: string;
    let udvtType: Codec.Format.Types.UserDefinedValueTypeType;
    let alternateUdvtType: Codec.Format.Types.UserDefinedValueTypeType;

    beforeAll(async () => {
      encoder = await Encoder.forArtifact(artifacts.TestContract, {
        projectInfo: { compilations }
      });
      abi = <Abi.FunctionEntry>(
        Abi.normalize(artifacts.TestContract.abi).find(
          entry => entry.type === "function" && entry.name === "takesCustom"
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
      alternateUdvtType = <Codec.Format.Types.UserDefinedValueTypeType>(
        Object.values(userDefinedTypes).find(
          type =>
            type.typeClass === "userDefinedValueType" &&
            type.typeName === "LegacyChar" &&
            type.kind === "local" &&
            type.definingContractName === "TestContract"
        )
      );
    });

    it("Encodes valid input for underlying type", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, ["0xff"]);
      assert.strictEqual(
        data,
        selector +
          "ff00000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes type/value input for underlying type", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        {
          type: "bytes1",
          value: "0xff"
        }
      ]);
      assert.strictEqual(
        data,
        selector +
          "ff00000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes wrapped input for underlying type", async () => {
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

    it("Encodes wrapped input for UDVT type", async () => {
      const wrapped = await encoder.wrapElementaryValue(udvtType, "0xff");
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "ff00000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes wrapped input for equivalent UDVT type", async () => {
      const wrapped = await encoder.wrapElementaryValue(
        alternateUdvtType,
        "0xff"
      );
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "ff00000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Rejects invalid input for underlying type", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["0xgg"]);
        assert.fail("Encoded non-hex string as Octet (bytes1)");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects invalid type/value input for underlying type", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [
          {
            type: "bytes32",
            value: "0xff"
          }
        ]);
        assert.fail("Value specified as bytes32 got encoded as Octet (bytes1)");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });
  });
});
