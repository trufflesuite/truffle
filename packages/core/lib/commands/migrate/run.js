module.exports = async function (options) {
  const WorkflowCompile = require("@truffle/workflow-compile").default;
  const { Environment } = require("@truffle/environment");
  const determineDryRunSettings = require("./determineDryRunSettings");
  const prepareConfigForRealMigrations = require("./prepareConfigForRealMigrations");
  const runMigrations = require("./runMigrations");
  const setUpDryRunEnvironmentThenRunMigrations = require("./setUpDryRunEnvironmentThenRunMigrations");
  const loadConfig = require("../../loadConfig");
  const OS = require("os");
  const TruffleError = require("@truffle/error");
  const tmp = require("tmp");
  tmp.setGracefulCleanup();

  if (options.url && options.network) {
    const message =
      "" +
      "Mutually exclusive options, --url and --network detected!" +
      OS.EOL +
      "Please use either --url or --network and try again." +
      OS.EOL +
      "See: https://trufflesuite.com/docs/truffle/reference/truffle-commands/#migrate" +
      OS.EOL;
    throw new TruffleError(message);
  }

  let config = loadConfig(options);
  if (config.compileNone || config["compile-none"]) {
    config.compiler = "none";
  }

  const result = await WorkflowCompile.compileAndSave(config);
  await WorkflowCompile.assignNames(config, result);
  await Environment.detect(config);

  const { dryRunOnly, dryRunAndMigrations } = determineDryRunSettings(
    config,
    options
  );

  if (dryRunOnly) {
    config.dryRun = true;
    await setUpDryRunEnvironmentThenRunMigrations(config);
  } else if (dryRunAndMigrations) {
    const currentBuild = config.contracts_build_directory;
    config.dryRun = true;

    await setUpDryRunEnvironmentThenRunMigrations(config);

    const { preparedConfig, proceed } = await prepareConfigForRealMigrations(
      currentBuild,
      options
    );
    if (proceed) await runMigrations(preparedConfig);
  } else {
    await runMigrations(config);
  }
};
