import debugModule from "debug";
const debug = debugModule("encoder:test:helpers");

import path from "path";
import { assert } from "chai";
import BN from "bn.js";
import fs from "fs-extra";
import Web3 from "web3";
import type { Provider } from "web3/providers";
import * as Codec from "@truffle/codec";
import type TruffleConfig from "@truffle/config";
import type { ContractObject as Artifact } from "@truffle/contract-schema/spec";
import type * as Common from "@truffle/compile-common";
//sorry, some untyped imports here :-/
const Box = require("@truffle/box").default; //Box is TS, but TS has problems with sandbox??
const WorkflowCompile = require("@truffle/workflow-compile");
const Deployer = require("@truffle/deployer");
const Resolver = require("@truffle/resolver"); //resolver is TS too but I can't make it typecheck :-/

interface StringMap {
  [key: string]: string;
}

interface Prepared {
  artifacts: { [name: string]: Artifact };
  compilations: Codec.Compilations.Compilation[];
  config: TruffleConfig;
  registryAddress: string;
}

export async function prepareContracts(
  sources: StringMap,
  addresses: StringMap,
  provider: Provider
): Promise<Prepared> {
  const from = (await new Web3(provider).eth.getAccounts())[0];

  let config = await createSandbox();

  config.compilers.solc.version = "0.8.9";

  config.networks["encoder"] = {
    network_id: "*",
    provider,
    from
  };
  config.network = "encoder";
  config.ens = { enabled: true };

  await addContracts(config, sources);
  let registryAddress = await setUpENS(config, addresses, from);
  let { compilations: rawCompilations } = await compile(config);
  let artifacts = Object.assign(
    {},
    ...rawCompilations.map(compilation =>
      Object.assign(
        {},
        ...compilation.contracts.map(contract => ({
          [contract.contractName]: contract
        }))
      )
    )
  );

  let compilations = Codec.Compilations.Utils.shimCompilations(rawCompilations);

  return {
    artifacts,
    compilations,
    config,
    registryAddress
  };
}

async function createSandbox(): Promise<TruffleConfig> {
  const config = await Box.sandbox({
    unsafeCleanup: true,
    setGracefulCleanup: true,
    name: "bare-box"
  });
  config.resolver = new Resolver(config);
  config.networks = {};

  return config;
}

async function addContracts(
  config: TruffleConfig,
  sources: StringMap = {}
): Promise<void> {
  let promises = [];
  for (let filename of Object.keys(sources)) {
    let source = sources[filename];
    promises.push(
      fs.outputFile(path.join(config.contracts_directory, filename), source)
    );
  }

  await Promise.all(promises);
}

async function compile(config: TruffleConfig): Promise<Common.CompilerResult> {
  return await WorkflowCompile.compile(
    config.with({
      all: true,
      quiet: true
    })
  );
}

async function setUpENS(
  config: TruffleConfig,
  addresses: StringMap,
  from: string
): Promise<string> {
  const deployer = new Deployer(config);
  await deployer.start();
  for (const [name, address] of Object.entries(addresses)) {
    await deployer.ens.setAddress(name, address, { from });
  }
  await deployer.finish();
  return deployer.ens.devRegistry.address;
}

//deepEqual doesn't seem to work for BNs here, so we'll do this
//manually instead :-/
export function checkEqTx(
  result: { [name: string]: any },
  expected: { [name: string]: any }
): void {
  assert.hasAllKeys(result, expected);
  for (const [key, value] of Object.entries(result)) {
    if (BN.isBN(expected[key])) {
      assert(BN.isBN(value));
      assert(value.eq(expected[key]));
    } else {
      assert.deepEqual(value, expected[key]);
    }
  }
}
