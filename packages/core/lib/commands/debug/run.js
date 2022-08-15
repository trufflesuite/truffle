module.exports = async function (options) {
  const OS = require("os");
  const { promisify } = require("util");
  const loadConfig = require("../../loadConfig");
  const { Environment } = require("@truffle/environment");
  const TruffleError = require("@truffle/error");
  const { CLIDebugger } = require("../../debug");

  if (options.url && options.network) {
    const message =
      "" +
      "Mutually exclusive options, --url and --network detected!" +
      OS.EOL +
      "Please use either --url or --network and try again." +
      OS.EOL +
      "See: https://trufflesuite.com/docs/truffle/reference/truffle-commands/#debug" +
      OS.EOL;
    throw new TruffleError(message);
  }

  let config = loadConfig(options);

  await Environment.detect(config);

  const txHash = config._[0]; //may be undefined
  if (config.fetchExternal && txHash === undefined) {
    throw new Error(
      "Fetch-external mode requires a specific transaction to debug"
    );
  }
  if (config.compileTests) {
    config.compileAll = true;
  }
  if (config.compileAll && config.compileNone) {
    throw new Error("Incompatible options passed regarding what to compile");
  }
  const interpreter = await new CLIDebugger(config, { txHash }).run();
  return await promisify(interpreter.start.bind(interpreter))();
};
