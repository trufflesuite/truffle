module.exports = async function (options) {
  const Artifactor = require("@truffle/artifactor");
  const Resolver = require("@truffle/resolver");
  const Migrate = require("@truffle/migrate");
  const WorkflowCompile = require("@truffle/workflow-compile");
  const { Environment } = require("@truffle/environment");
  const Config = require("@truffle/config");
  const { promisify } = require("util");
  const promisifiedCopy = promisify(require("../../copy"));
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
    await Environment.fork(config);
    // Copy artifacts to a temporary directory
    const temporaryDirectory = tmp.dirSync({
      unsafeCleanup: true,
      prefix: "migrate-dry-run-"
    }).name;

    await promisifiedCopy(config.contracts_build_directory, temporaryDirectory);

    config.contracts_build_directory = temporaryDirectory;
    // Note: Create a new artifactor and resolver with the updated config.
    // This is because the contracts_build_directory changed.
    // Ideally we could architect them to be reactive of the config changes.
    config.artifactor = new Artifactor(temporaryDirectory);
    config.resolver = new Resolver(config);

    return await runMigrations(config);
  }

  async function runMigrations(config) {
    Migrate.launchReporter(config);

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

const determineDryRunSettings = function (config, options) {
  // Source: ethereum.stackexchange.com/questions/17051
  const networkWhitelist = [
    1, // Mainnet (ETH & ETC)
    2, // Morden (ETC)
    3, // Ropsten
    4, // Rinkeby
    5, // Goerli
    8, // Ubiq
    42, // Kovan (Parity)
    77, // Sokol
    99, // Core

    7762959, // Musiccoin
    61717561 // Aquachain
  ];

  let dryRunOnly, skipDryRun;
  const networkSettingsInConfig = config.networks[config.network];
  if (networkSettingsInConfig) {
    dryRunOnly =
      options.dryRun === true ||
      networkSettingsInConfig.dryRun === true ||
      networkSettingsInConfig["dry-run"] === true;
    skipDryRun =
      options.skipDryRun === true ||
      networkSettingsInConfig.skipDryRun === true ||
      networkSettingsInConfig["skip-dry-run"] === true;
  } else {
    dryRunOnly = options.dryRun === true;
    skipDryRun = options.skipDryRun === true;
  }
  const production =
    networkWhitelist.includes(parseInt(config.network_id)) || config.production;
  const dryRunAndMigrations = production && !skipDryRun;
  return { dryRunOnly, dryRunAndMigrations };
};

const prepareConfigForRealMigrations = async function (buildDir, options) {
  const Artifactor = require("@truffle/artifactor");
  const Resolver = require("@truffle/resolver");
  const Migrate = require("@truffle/migrate");
  const { Environment } = require("@truffle/environment");
  const Config = require("@truffle/config");

  let accept = true;

  if (options.interactive) {
    accept = await Migrate.acceptDryRun();
  }

  if (accept) {
    const config = Config.detect(options);

    config.contracts_build_directory = buildDir;
    config.artifactor = new Artifactor(buildDir);
    config.resolver = new Resolver(config);

    try {
      await Environment.detect(config);
    } catch (error) {
      throw new Error(error);
    }

    config.dryRun = false;
    return { config, proceed: true };
  } else {
    return { proceed: false };
  }
};
