import debugModule from "debug";
const debug = debugModule("test:helpers");

import path from "path";
import fs from "fs-extra";
import WorkflowCompile from "@truffle/workflow-compile";
import Artifactor from "@truffle/artifactor";
import Web3 from "web3";
import Migrate from "@truffle/migrate";
import Box from "@truffle/box";
import Resolver from "@truffle/resolver";
import * as Codec from "@truffle/codec";

export async function prepareContracts(provider, sources = {}, migrations) {
  let config = await createSandbox();

  let accounts = await getAccounts(provider);

  config.networks["debugger"] = {
    provider: provider,
    network_id: "*",
    from: accounts[0]
  };
  config.network = "debugger";

  config.compilers = {
    solc: {
      version: "0.7.1",
      settings: {
        optimizer: { enabled: false, runs: 200 },
        evmVersion: "constantinople"
      }
    }
  };

  await addContracts(config, sources);
  let { contractNames, files } = await compile(config);

  if (!migrations) {
    migrations = await defaultMigrations(contractNames);
  }

  await addMigrations(config, migrations);
  await migrate(config);

  let artifacts = await gatherArtifacts(config);
  debug(
    "artifacts: %o",
    artifacts.map(a => a.contractName)
  );

  let abstractions = {};
  for (let name of contractNames) {
    abstractions[name] = config.resolver.require(name);
  }

  let compilations = Codec.Compilations.Utils.shimArtifacts(artifacts, files);

  return {
    files,
    abstractions,
    compilations,
    config
  };
}

export function getAccounts(provider) {
  let web3 = new Web3(provider);
  return new Promise(function (accept, reject) {
    web3.eth.getAccounts(function (err, accounts) {
      if (err) return reject(err);
      accept(accounts);
    });
  });
}

export async function createSandbox() {
  const config = await Box.sandbox({
    unsafeCleanup: true,
    setGracefulCleanup: true,
    name: "bare-box"
  });
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
  const collectedCompilationOutput = compilations.reduce(
    (a, compilation) => {
      if (compilation.compiler.name === "solc") {
        for (const contract of compilation.contracts) {
          a.contractNames = a.contractNames.concat(contract.contractName);
        }
        a.sourceIndexes = a.sourceIndexes.concat(compilation.sourceIndexes);
      }
      return a;
    },
    { contractNames: [], sourceIndexes: [] }
  );
  const sourceIndexes = collectedCompilationOutput.sourceIndexes.filter(
    (item, index) => {
      return collectedCompilationOutput.sourceIndexes.indexOf(item) === index;
    }
  );
  const contractNames = collectedCompilationOutput.contractNames.filter(
    (item, index) => {
      return collectedCompilationOutput.contractNames.indexOf(item) === index;
    }
  );
  return {
    contractNames,
    files: sourceIndexes
  };
}

export async function migrate(config) {
  return new Promise(function (accept, reject) {
    Migrate.run(
      config.with({
        quiet: true
      }),
      function (err, contracts) {
        if (err) return reject(err);
        accept(contracts);
      }
    );
  });
}

export async function gatherArtifacts(config) {
  // Gather all available contract artifacts
  const files = fs.readdirSync(config.contracts_build_directory);

  let contracts = files
    .filter(filePath => {
      return path.extname(filePath) === ".json";
    })
    .map(filePath => {
      return path.basename(filePath, ".json");
    })
    .map(contractName => {
      return config.resolver.require(contractName);
    });

  await Promise.all(contracts.map(abstraction => abstraction.detectNetwork()));

  return contracts;
}

export function lineOf(searchString, source) {
  const lines = source.split("\n");
  return lines.findIndex(line => line.includes(searchString));
}
