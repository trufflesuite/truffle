import path from "path";
import fs from "fs-extra";
import dir from "node-dir";
import async from "async";
import Contracts from "truffle-core/lib/contracts";
import Artifactor from "truffle-artifactor";
import Web3 from "web3";
import Migrate from "truffle-migrate";
import Box from "truffle-box";
import Resolver from "truffle-resolver";
import expect from "truffle-expect";
import { Contract } from "../lib/types";

export async function prepareConfig(provider, contracts = {}, migrations = {}) {
  let config = await createSandbox();

  let accounts = await getAccounts(provider);

  config.networks["debugger"] = {
    provider: provider,
    network_id: "*",
    from: accounts[0]
  }
  config.network = "debugger";

  await addContracts(config, contracts, migrations);
  await compile(config);
  await migrate(config);

  return config;
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

export async function addContracts(config, contracts = {}, migrations = {}) {
  let promises = [];
  for (let filename of Object.keys(contracts)) {
    let source = contracts[filename];
    promises.push(
      fs.outputFile(path.join(config.contracts_directory, filename), source)
    );
  }

  for (let filename of Object.keys(migrations)) {
    let source = migrations[filename];
    promises.push(
      fs.outputFile(path.join(config.migrations_directory, filename), source)
    );
  }

  return await Promise.all(promises);
}

export async function compile(config) {
  return new Promise(function(accept, reject) {
    Contracts.compile(config.with({
      all: true,
      quiet: true
    }), function(err, contracts) {
      if (err) return reject(err);
      return accept(contracts);
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

export async function gatherContracts(config) {
  expect.options(config, [
    "resolver"
  ]);

  return new Promise((accept, reject) => {
    // Gather all available contract artifacts
    dir.files(config.contracts_build_directory, (err, files) => {
      if (err) return reject(err);

      var contracts = files.filter((file_path) => {
        return path.extname(file_path) == ".json";
      }).map((file_path) => {
        return path.basename(file_path, ".json");
      }).map((contract_name) => {
        return config.resolver.require(contract_name);
      });

      async.each(contracts, (abstraction, finished) => {
        abstraction.detectNetwork().then(() => {
          finished();
        }).catch(finished);
      }, (err) => {
        if (err) return reject(err);
        accept(contracts.map( (contract) => {
          return new Contract({
            contractName: contract.contractName,
            source: contract.source,
            sourceMap: contract.sourceMap,
            sourcePath: contract.sourcePath,
            binary: contract.binary,
            deployedBinary: contract.deployedBinary,
            deployedSourceMap: contract.deployedSourceMap
          });
        }));
      });
    });
  });

}
