module.exports = async function (options) {
  const WorkflowCompile = require("@truffle/workflow-compile").default;
  const { Environment } = require("@truffle/environment");
  const Config = require("@truffle/config");
  const determineDryRunSettings = require("./determineDryRunSettings");
  const prepareConfigForRealMigrations = require("./prepareConfigForRealMigrations");
  const runMigrations = require("./runMigrations");
  const setUpDryRunEnvironmentThenRunMigrations = require("./setUpDryRunEnvironmentThenRunMigrations");
  const tmp = require("tmp");
  tmp.setGracefulCleanup();
  const { Runner } = require("@truffle/solver");

  const config = Config.detect(options);

  if (config.compileNone || config["compile-none"]) {
    config.compiler = "none";
  }

  const result = await WorkflowCompile.compileAndSave(config);
  await WorkflowCompile.assignNames(config, result);
  await Environment.detect(config);

  // if declarative deployments are enabled, run the solver package to kick of migrations
  if (config.declarativeDeployment.enabled) {
    if (config.declarativeDeployment.filepath) {
      await Runner.solve(config, options);
    } else {
      throw new Error(
        "Declarative deployment enabled but no filepath provided"
      );
    }

    return;
  }

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
