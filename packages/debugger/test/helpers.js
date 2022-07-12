import debugModule from "debug";
const debug = debugModule("debugger:test:helpers");

import path from "path";
import fs from "fs-extra";
import WorkflowCompile from "@truffle/workflow-compile";
import Artifactor from "@truffle/artifactor";
import Web3 from "web3";
import Migrate from "@truffle/migrate";
import { Resolver } from "@truffle/resolver";
import * as Codec from "@truffle/codec";
import tmp from "tmp";
import Config from "@truffle/config";

export const testBlockGasLimit = 7000000;
export const testDefaultTxGasLimit = testBlockGasLimit;

export async function prepareContracts(provider, sources = {}, migrations) {
  let config = await createSandbox();

  const accounts = await new Web3(provider).eth.getAccounts();

  config.networks["debugger"] = {
    provider: provider,
    network_id: "*",
    from: accounts[0]
  };
  config.network = "debugger";

  config.compilers = {
    solc: {
      version: "0.8.12",
      settings: {
        optimizer: { enabled: false, runs: 200 },
        evmVersion: "london"
      }
    },
    vyper: {
      settings: {
        evmVersion: "berlin"
      }
    }
  };

  await addContracts(config, sources);
  let { contractNames, compilations: rawCompilations } = await compile(config);

  if (migrations !== null) {
    //we'll use migrations === null (as opposed to undefined) as a signal that
    //we don't want to do any migrating
    if (!migrations) {
      migrations = await defaultMigrations(contractNames);
    }

    await addMigrations(config, migrations);
    await migrate(config);
  }

  let abstractions = {};
  for (let name of contractNames) {
    abstractions[name] = config.resolver.require(name);
  }

  let compilations = Codec.Compilations.Utils.shimCompilations(rawCompilations);

  return {
    abstractions,
    compilations,
    config
  };
}

export async function createSandbox() {
  const tempDir = tmp.dirSync({ unsafeCleanup: true });
  fs.copySync(
    path.join(__dirname, "..", "test", "sources", "init"),
    tempDir.name
  );
  const config = new Config(undefined, tempDir.name);
  config.resolver = new Resolver(config);
  config.artifactor = new Artifactor(config.contracts_build_directory);
  config.networks = {};
  return config;
}

export async function addContracts(config, sources = {}) {
  let promises = [];
  for (let filename of Object.keys(sources)) {
    let source = sources[filename];
    promises.push(
      fs.outputFile(path.join(config.contracts_directory, filename), source)
    );
  }

  return await Promise.all(promises);
}

export async function addMigrations(config, migrations = {}) {
  let promises = [];
  for (let filename of Object.keys(migrations)) {
    let source = migrations[filename];
    promises.push(
      fs.outputFile(path.join(config.migrations_directory, filename), source)
    );
  }

  return await Promise.all(promises);
}

export async function defaultMigrations(contractNames) {
  contractNames = contractNames.filter(name => name !== "Migrations");

  let migrations = {};

  contractNames.forEach((contractName, i) => {
    let index = i + 2; // start at 2 cause Migrations migration
    let filename = `${index}_migrate_${contractName}.js`;
    let source = `
      var ${contractName} = artifacts.require("${contractName}");

      module.exports = function(deployer) {
        deployer.deploy(${contractName});
      };
    `;

    migrations[filename] = source;
  });

  return migrations;
}

export async function compile(config) {
  const { compilations } = await WorkflowCompile.compileAndSave(
    config.with({
      all: true,
      quiet: true
    })
  );
  const contractNames = compilations.flatMap(compilation =>
    compilation.contracts.map(contract => contract.contractName)
  );
  return { compilations, contractNames };
}

export async function migrate(config) {
  return await Migrate.run(config.with({ quiet: true }));
}

export function lineOf(searchString, source) {
  const lines = source.split("\n");
  return lines.findIndex(line => line.includes(searchString));
}
