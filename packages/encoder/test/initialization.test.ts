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

describe("Bytecodeless operation", () => {
  let encoder: Encoder.ContractEncoder;
  let abi: Abi.FunctionEntry;
  let selector: string;

  beforeAll(async () => {
    const artifact = artifacts.TestInterface;
    //remove name to check that it still works w/o bytecode *or* name
    //this confuses TS, so I'll just coerce
    const anonymousArtifact = <Artifact>{
      ...artifact,
      contractName: undefined
    };
    encoder = await Encoder.forArtifact(anonymousArtifact, {
      projectInfo: { compilations }
    });
    abi = <Abi.FunctionEntry>(
      Abi.normalize(artifacts.TestInterface.abi).find(
        entry => entry.type === "function" && entry.name === "doThings"
      )
    );
    selector = Codec.AbiData.Utils.abiSelector(abi);
  });

  it("Encodes integers", async () => {
    const { data } = await encoder.encodeTxNoResolution(abi, [1]);
    assert.strictEqual(
      data,
      selector +
        "0000000000000000000000000000000000000000000000000000000000000001"
    );
  });
});
