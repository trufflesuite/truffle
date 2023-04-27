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
import type { Web3BaseProvider as Provider } from "web3-types";

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
            entry => entry.type === "function" && entry.name === "takesMultiple"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes multiple arguments", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [1, 2]);
        assert.strictEqual(
          data,
          selector +
            "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002"
        );
      });

      it("Encodes multiple arguments & options", async () => {
        const { value, data } = await encoder.encodeTxNoResolution(
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
          await encoder.encodeTxNoResolution(abi, [256, 2]);
          assert.fail("Arguments got encoded though one invalid");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects if too few arguments", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [1]);
          assert.fail("Too few arguments should fail");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects if options given but not turned on", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [1, 2, { value: 1 }]);
          assert.fail("Can't take options if options not turned on");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects if additional argument but not options", async () => {
        try {
          await encoder.encodeTxNoResolution(abi, [1, 2, 3], {
            allowOptions: true
          });
          assert.fail("Additional argument should be rejected if not options");
        } catch (error) {
          if (error.name !== "TypeMismatchError") {
            throw error;
          }
        }
      });

      it("Rejects if multiple extra arguments", async () => {
        try {
          await encoder.encodeTxNoResolution(
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
              entry.type === "function" && entry.name === "takesMultipleDynamic"
          )
        );
        selector = Codec.AbiData.Utils.abiSelector(abi);
      });

      it("Encodes multiple arguments", async () => {
        const { data } = await encoder.encodeTxNoResolution(abi, [1, "ABC"]);
        assert.strictEqual(
          data,
          selector +
            "0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000034142430000000000000000000000000000000000000000000000000000000000"
        );
      });
    });
  });
});
