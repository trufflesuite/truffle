const options = {
  network: {
    option: "--network <name>",
    description:
      "Specify the network to use. Network name must exist in the configuration."
  },
  from: {
    option: "--from <account>",
    description:
      "Specify the account from which to make calls or send transactions."
  },
  config: {
    option: "--config <file>",
    description:
      "Specify configuration file to be used. The default is truffle-config.js"
  },
  quiet: {
    option: "--quiet",
    description: "Suppress excess logging output."
  }
};
module.exports = options;
