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

import BN from "bn.js";

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
  describe("Booleans", () => {
    let encoder: Encoder.ContractEncoder;
    let abi: Abi.FunctionEntry;
    let selector: string;
    let udvtType: Codec.Format.Types.UserDefinedValueTypeType;

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
      const userDefinedTypes = encoder
        .getProjectEncoder()
        .getUserDefinedTypes();
      udvtType = <Codec.Format.Types.UserDefinedValueTypeType>(
        Object.values(userDefinedTypes).find(
          type =>
            type.typeClass === "userDefinedValueType" &&
            type.typeName === "Flag" &&
            type.kind === "local" &&
            type.definingContractName === "TestContract"
        )
      );
    });

    it("Encodes booleans (true)", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [true], {
        strictBooleans: true
      });
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes booleans (false)", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [false], {
        strictBooleans: true
      });
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes boxed booleans", async () => {
      const { data } = await encoder.encodeTxNoResolution(
        abi,
        [new Boolean(false)],
        { strictBooleans: true }
      );
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes variations of 'true' as true", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, ["tRue"], {
        strictBooleans: true
      });
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes general strings as true", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, ["blorb"]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes empty strings as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [""]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes variations of 'false' as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, ["FaLsE"], {
        strictBooleans: true
      });
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes '1' as true", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, ["1"], {
        strictBooleans: true
      });
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes '0' as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, ["0"], {
        strictBooleans: true
      });
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes boxed empty strings as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new String("")
      ]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes boxed variations of 'false' as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(
        abi,
        [new String("FaLsE")],
        { strictBooleans: true }
      );
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes general numbers as true", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [3]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes 0 as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [0]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes NaN as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [NaN]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes boxed 0 as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [new Number(0)]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes boxed NaN as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
        new Number(NaN)
      ]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes null as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [null]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes undefined as false", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [undefined]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes {} as true", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [{}]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes [] as true", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [[]]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes type/value pair", async () => {
      const { data } = await encoder.encodeTxNoResolution(abi, [
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Encodes wrapped UDVTs", async () => {
      const wrapped = await encoder.wrapElementaryValue(udvtType, false);
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
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
          raw: "0x0000000000000000000000000000000000000000000000000000000000000100",
          paddingType: "left"
        }
      };
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Encodes wrapped UDVTs with permitted errors", async () => {
      const wrapped = {
        type: udvtType,
        kind: "error",
        error: {
          kind: "WrappedError",
          error: {
            type: { typeClass: "bool" },
            kind: "error",
            error: {
              kind: "BoolOutOfRangeError",
              rawAsBN: new BN(2)
            }
          }
        }
      };
      const { data } = await encoder.encodeTxNoResolution(abi, [wrapped]);
      assert.strictEqual(
        data,
        selector +
          "0000000000000000000000000000000000000000000000000000000000000001"
      );
    });

    it("Rejects type/value pair for wrong type (even w/loose)", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, [{ type: "uint", value: "1" }]);
        assert.fail("Value specified as uint got encoded as bool");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects wrapped value for wrong type (even w/loose)", async () => {
      const wrapped = await encoder.wrapElementaryValue(
        { typeClass: "uint", bits: 256 },
        "1"
      );
      try {
        await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.fail("Value wrapped as uint got encoded as bool");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects general wrapped error result (even w/loose)", async () => {
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
        await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.fail("Error result (of general sort) got encoded as bool");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects general wrapped UDVT error result (even w/loose)", async () => {
      const wrapped = {
        type: udvtType,
        kind: "error",
        error: {
          kind: "WrappedError",
          error: {
            type: { typeClass: "bool" },
            kind: "error",
            error: {
              kind: "ReadErrorStack",
              from: 0,
              to: 0
            }
          }
        }
      };
      try {
        await encoder.encodeTxNoResolution(abi, [wrapped]);
        assert.fail(
          "Error result (of general sort) for UDVT got encoded as bool"
        );
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });

    it("Rejects general strings with strictBooleans turned on", async () => {
      try {
        await encoder.encodeTxNoResolution(abi, ["moobytooble"], {
          strictBooleans: true
        });
        assert.fail("General string got encoded as bool despite strict option");
      } catch (error) {
        if (error.name !== "TypeMismatchError") {
          throw error;
        }
      }
    });
  });
});
