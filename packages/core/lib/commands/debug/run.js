module.exports = async function (options) {
  const { promisify } = require("util");
  const debugModule = require("debug");
  const debug = debugModule("lib:commands:debug");

  const { Environment } = require("@truffle/environment");
  const Config = require("@truffle/config");

  const { CLIDebugger } = require("../../debug");

  let config = null;
  if (options.url) {
    config = Config.default();
    config.networks = {
      inline_config: {
        url: options.url,
        network_id: "*"
      }
    }
    config.network = options.network ? options.network : "inline_config";
    config._ = [];
  } else {
    config = Config.detect(options);
  }

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
    throw new Error(
      "Incompatible options passed regarding what to compile"
    );
  }
  const interpreter = await new CLIDebugger(config, {txHash}).run();
  return await promisify(interpreter.start.bind(interpreter))();
}
