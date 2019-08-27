const TruffleConfig = require("truffle-config");
const Logger = require("./logDecorator");
const getTruffleConfig = require("./getTruffleConfig");

const genBuildOptions = buildOpts => {
  if (!buildOpts.network) {
    throw new Error(
      "You must specify the network name to deploy to. (network)"
    );
  }

  const truffleConfig = getTruffleConfig();

  if (!truffleConfig) {
    throw new Error("No Truffle Config file found!");
  }

  const config = TruffleConfig.load(truffleConfig, buildOpts);
  config.reset = true; // TODO make this configurable
  config.logger = Logger; // NOTE: this will be used within truffle
  return config;
};

module.exports = genBuildOptions;
