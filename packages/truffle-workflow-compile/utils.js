const Config = require("truffle-config");
const expect = require("truffle-expect");
const Resolver = require("truffle-resolver");
const Artifactor = require("truffle-artifactor");

function prepareConfig(options) {
  expect.options(options, ["contracts_build_directory"]);

  expect.one(options, ["contracts_directory", "files"]);

  // Use a config object to ensure we get the default sources.
  const config = Config.default().merge(options);

  config.compilersInfo = {};

  if (!config.resolver) config.resolver = new Resolver(config);

  if (!config.artifactor) {
    config.artifactor = new Artifactor(config.contracts_build_directory);
  }

  return config;
}

function multiPromisify(func) {
  return (...args) =>
    new Promise((accept, reject) => {
      const callback = (err, ...results) => {
        if (err) reject(err);

        accept(results);
      };

      func(...args, callback);
    });
}

function byContractName(contracts) {
  return contracts
    .map(contract => ({
      [contract.contractName || contract.contract_name]: contract
    }))
    .reduce((a, b) => Object.assign({}, a, b), {});
}

module.exports = {
  prepareConfig,
  multiPromisify,
  byContractName
};
