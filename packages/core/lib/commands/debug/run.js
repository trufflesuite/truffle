module.exports = async function (options) {
  const { promisify } = require("util");
  const debugModule = require("debug");
  const loadConfig = require("../../loadConfig");
  const debug = debugModule("lib:commands:debug");

  const { Environment } = require("@truffle/environment");
  const { CLIDebugger } = require("../../debug");

  if (options.url && options.network) {
    throw new Error("Url and Network options should not be specified together");
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
