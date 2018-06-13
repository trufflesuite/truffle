import debugModule from "debug";
const debug = debugModule("test:helpers");

import path from "path";
import fs from "fs-extra";
import async from "async";
import Contracts from "truffle-workflow-compile";
import Debug from "truffle-debug-utils";
import Artifactor from "truffle-artifactor";
import Web3 from "web3";
import Migrate from "truffle-migrate";
import Box from "truffle-box";
import Resolver from "truffle-resolver";
import expect from "truffle-expect";

export async function prepareContracts(provider, sources = {}, migrations) {
  let config = await createSandbox();

  let accounts = await getAccounts(provider);

  config.networks["debugger"] = {
    provider: provider,
    network_id: "*",
    from: accounts[0]
  }
  config.network = "debugger";

  await addContracts(config, sources);
  let { contracts, files } = await compile(config);
  let contractNames = Object.keys(contracts);

  if (!migrations) {
    migrations = await defaultMigrations(contractNames);
  }

  await addMigrations(config, migrations);
  await migrate(config);

  let artifacts = await gatherArtifacts(config);
  debug("artifacts: %o", artifacts.map((a) => a.contractName));

  let abstractions = {};
  contractNames.forEach( (name) => {
    abstractions[name] = config.resolver.require(name);
  });

  return {
    files,
    abstractions,
    artifacts,
    config
  };
}

export function getAccounts(provider) {
  let web3 = new Web3(provider);
  return new Promise(function(accept, reject) {
    web3.eth.getAccounts(function(err, accounts) {
      if (err) return reject(err);
      accept(accounts);
    });
  });
}

export async function createSandbox() {
  let config = await new Promise(function(accept, reject) {
    Box.sandbox(function(err, result) {
      if (err) return reject(err);
      result.resolver = new Resolver(result);
      result.artifactor = new Artifactor(result.contracts_build_directory);
      result.networks = {};

      accept(result);
    });
  });

  await fs.remove(path.join(config.contracts_directory, "MetaCoin.sol"));
  await fs.remove(path.join(config.contracts_directory, "ConvertLib.sol"));
  await fs.remove(path.join(config.migrations_directory, "2_deploy_contracts.js"));

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
  contractNames = contractNames.filter((name) => name != "Migrations");

  let migrations = {};

  contractNames.forEach( (contractName, i) => {
    let index = i + 2;  // start at 2 cause Migrations migration
    let filename = `${index}_migrate_${contractName}.js`;
    let source = `
      var ${contractName} = artifacts.require("${contractName}");

      module.exports = function(deployer) {
        deployer.deploy(${contractName});
      };
    `;

    migrations[filename] = source
  });

  return migrations;
}

export async function compile(config) {
  return new Promise(function(accept, reject) {
    Contracts.compile(config.with({
      all: true,
      quiet: true
    }), function(err, contracts, files) {
      if (err) return reject(err);
      return accept({contracts, files});
    });
  });
}

export async function migrate(config) {
  return new Promise(function(accept, reject) {
    Migrate.run(config.with({
      quiet: true
    }), function(err, contracts) {
      if (err) return reject(err);
      accept(contracts);
    });
  });
}

export async function gatherArtifacts(config) {
  return Debug.gatherArtifacts(config);
}
