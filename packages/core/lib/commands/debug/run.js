module.exports = async function (options) {
  const OS = require("os");
  const { promisify } = require("util");
  const loadConfig = require("../../loadConfig");
  const { Environment } = require("@truffle/environment");
  const FromHardhat = require("@truffle/from-hardhat");
  const Codec = require("@truffle/codec");
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

  let config;
  let compilations;
  try {
    config = loadConfig(options);
  } catch (configError) {
    // if we can't load config, check to see if this is a hardhat project
    try {
      await FromHardhat.expectHardhat();

      config = await FromHardhat.prepareConfig();
      config.merge(options);
      compilations = Codec.Compilations.Utils.shimCompilations(
        await FromHardhat.prepareCompilations()
      );
    } catch (hardhatError) {
      // if it's not a hardhat project, throw the original error
      // otherwise, throw whatever error we got when process hardhat
      const error =
        hardhatError instanceof FromHardhat.NotHardhatError
          ? configError
          : hardhatError;

      throw error;
    }
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
    throw new Error("Incompatible options passed regarding what to compile");
  }

  // Create a new CLIDebugger instance
  const cliDebugger = new CLIDebugger(config, {
    txHash,
    compilations
  });

  // Checks if the user wants to debug in vscode
  if (config.vscode) {
    await cliDebugger.openVSCodeDebug();
    return;
  }

  // Starts the cli debugger
  const interpreter = await cliDebugger.run();
  return await promisify(interpreter.start.bind(interpreter))();
};
