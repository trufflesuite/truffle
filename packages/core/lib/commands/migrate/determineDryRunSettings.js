const Ganache = require("ganache");

module.exports = function (config, options) {
  //note: this is a list of chain IDs but we're still using
  //network ID.  This should be fixed later.
  const supportedChainIds = Ganache.__experimental_info().fork.knownChainIds;

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
    supportedChainIds.includes(parseInt(config.network_id)) ||
    config.production;
  const dryRunAndMigrations = production && !skipDryRun;
  return { dryRunOnly, dryRunAndMigrations };
};
