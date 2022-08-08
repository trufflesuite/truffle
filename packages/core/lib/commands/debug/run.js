module.exports = async function (options) {
  const fs = require("fs/promises");
  const { promisify } = require("util");
  const debugModule = require("debug");
  const loadConfig = require("../../loadConfig");
  const debug = debugModule("lib:commands:debug");

  const Config = require("@truffle/config");
  const { Environment } = require("@truffle/environment");
  const { CLIDebugger } = require("../../debug");
  const CompileCommon = require("@truffle/compile-common");
  const Codec = require("@truffle/codec");

  if (options.url && options.network) {
    throw new Error("Url and Network options should not be specified together");
  }

  let config;
  let compilations;
  try {
    config = loadConfig(options);
  } catch {
    config = Config.default();
    config.network = "development";
    config.networks["development"] = {
      url: "http://127.0.0.1:8545",
      network_id: "*"
    };

    require(`${config.working_directory}/node_modules/hardhat/register`);
    const {
      artifacts
    } = require(`${config.working_directory}/node_modules/hardhat`);
    const buildInfoPaths = await artifacts.getBuildInfoPaths();
    const buildInfos = await Promise.all(
      buildInfoPaths.map(async buildInfoPath =>
        JSON.parse(await fs.readFile(buildInfoPath))
      )
    );
    compilations = Codec.Compilations.Utils.shimCompilations(
      buildInfos.map(CompileCommon.Shims.Hardhat.buildInfoCompilation)
    );
  }

  await Environment.detect(config);

  const txHash = options._[0]; //may be undefined
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
  const interpreter = await new CLIDebugger(config, {
    compilations,
    txHash
  }).run();
  return await promisify(interpreter.start.bind(interpreter))();
};
