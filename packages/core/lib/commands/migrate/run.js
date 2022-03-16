module.exports = async function (options) {
  const Artifactor = require("@truffle/artifactor");
  const Resolver = require("@truffle/resolver");
  const Migrate = require("@truffle/migrate");
  const WorkflowCompile = require("@truffle/workflow-compile");
  const { Environment } = require("@truffle/environment");
  const Config = require("@truffle/config");
  const { promisify } = require("util");
  const copy = require("../../copy");
  const determineDryRunSettings = require("./determineDryRunSettings");
  const prepareConfigForRealMigrations = require("./prepareConfigForRealMigrations");
  const tmp = require("tmp");
  tmp.setGracefulCleanup();

  const conf = Config.detect(options);
  if (conf.compileNone || conf["compile-none"]) {
    conf.compiler = "none";
  }

  const result = await WorkflowCompile.compileAndSave(conf);
  await WorkflowCompile.assignNames(conf, result);
  await Environment.detect(conf);

  const { dryRunOnly, dryRunAndMigrations } = determineDryRunSettings(
    conf,
    options
  );

  if (dryRunOnly) {
    conf.dryRun = true;
    await setupDryRunEnvironmentThenRunMigrations(conf);
  } else if (dryRunAndMigrations) {
    const currentBuild = conf.contracts_build_directory;
    conf.dryRun = true;

    await setupDryRunEnvironmentThenRunMigrations(conf);

    let { config, proceed } = await prepareConfigForRealMigrations(
      currentBuild,
      options
    );
    if (proceed) await runMigrations(config);
  } else {
    await runMigrations(conf);
  }

  async function setupDryRunEnvironmentThenRunMigrations(config) {
    await Environment.fork(config, {
      logging: {
        quiet: true
      },
      // we need to tell Ganache to not unlock any accounts so that only
      // user's accounts are unlocked since this will be a dry run
      wallet: {
        totalAccounts: 0
      }
    });
    // Copy artifacts to a temporary directory
    const temporaryDirectory = tmp.dirSync({
      unsafeCleanup: true,
      prefix: "migrate-dry-run-"
    }).name;

    await promisify(copy)(config.contracts_build_directory, temporaryDirectory);

    config.contracts_build_directory = temporaryDirectory;
    // Note: Create a new artifactor and resolver with the updated config.
    // This is because the contracts_build_directory changed.
    // Ideally we could architect them to be reactive of the config changes.
    config.artifactor = new Artifactor(temporaryDirectory);
    config.resolver = new Resolver(config);

    return await runMigrations(config);
  }

  async function runMigrations(config) {
    if (options.f) {
      return await Migrate.runFrom(options.f, config);
    } else {
      const needsMigrating = await Migrate.needsMigrating(config);

      if (needsMigrating) {
        return await Migrate.run(config);
      } else {
        config.logger.log("Network up to date.");
        return;
      }
    }
  }
};
